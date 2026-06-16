import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  CheckCircle2,
  FileText,
  CreditCard,
  Truck,
  Navigation,
  Camera,
  Banknote,
} from 'lucide-react';

import { showSuccess, showError } from '../../utils/toast';
import { getOrder, cancelOrder } from '../../services/orders';
import { processPayment, retryPayment, collectCashPayment } from '../../services/payments';
import { startDelivery, markArrived } from '../../services/delivery';
import { Btn, Badge, Spinner } from '../../components/index';
import PaymentModal from '../../components/PaymentModal';
import MapModal from '../../components/MapModal';

import {
  statusBadge,
  payBadge,
  money,
  fmtDateTime,
  cylinderLabel,
  updateCachedOrder,
} from '../../utils/helpers';

import { useAuth } from '../../context/AuthContext';
import type { Order, RefundStatus } from '../../types';

const ORDER_STEPS = [
  { key: 'PLACED',           label: 'Placed'           },
  { key: 'CONFIRMED',        label: 'Confirmed'        },
  { key: 'ASSIGNED',         label: 'Assigned'         },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED',        label: 'Delivered'        },
] as const;

const refundBadge: Record<RefundStatus, { label: string; cls: string }> = {
  NOT_REQUIRED: { label: 'Not Required', cls: 'bg-gray-100 text-gray-500' },
  PENDING:      { label: 'Pending',      cls: 'bg-yellow-100 text-yellow-700' },
  COMPLETED:    { label: 'Completed',    cls: 'bg-green-100 text-green-700' },
};

// ── Read-only completed step ───────────────────────────────────────────────────
function DoneStep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 size={14} className="text-emerald-600" strokeWidth={2.5} />
      </div>
      <span className="text-sm text-gray-400 font-medium line-through decoration-gray-300">{label}</span>
    </div>
  );
}

// ── Primary action button ─────────────────────────────────────────────────────
function PrimaryBtn({
  onClick, disabled, loading, icon, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-brand-700 text-white hover:bg-brand-800 px-6 py-3.5 text-sm shadow-brand"
    >
      {icon}
      {loading ? 'Please wait…' : children}
    </button>
  );
}

// ── Secondary action button ───────────────────────────────────────────────────
function SecondaryBtn({
  onClick, disabled, loading, icon, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-white text-brand-700 border-2 border-brand-200 hover:bg-brand-50 px-6 py-3 text-sm"
    >
      {icon}
      {loading ? 'Please wait…' : children}
    </button>
  );
}

// ── Delivery partner guided workflow ──────────────────────────────────────────
function PartnerWorkflow({
  order,
  busy,
  act,
  navigate,
}: {
  order: Order;
  busy: string;
  act: (key: string, fn: () => Promise<unknown>) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  // markArrived sends an SMS but does NOT change order.status.
  // Track locally so the button disappears after tapping.
  const [arrivedDone, setArrivedDone] = useState(false);

  // ── Map modal state ────────────────────────────────────────────────────────
  // Replaces the previous window.open() / new-tab behaviour.
  const [mapOpen, setMapOpen] = useState(false);

  const isCash        = order.paymentMethod === 'CASH';
  const isAssigned    = order.status === 'ASSIGNED';
  const isOFD         = order.status === 'OUT_FOR_DELIVERY';
  const isDelivered   = order.status === 'DELIVERED';
  const cashCollected = isCash && order.paymentStatus === 'SUCCESS';


  const hasCoords =
    typeof order.latitude  === 'number' &&
    typeof order.longitude === 'number' &&
    !(order.latitude === 0 && order.longitude === 0);


  const mapLat = hasCoords ? (order.latitude  as number) : 13.0827;
  const mapLng = hasCoords ? (order.longitude as number) : 80.2707;

  // ── Fully completed ──────────────────────────────────────────────────────────
  if (isDelivered && (!isCash || cashCollected)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mt-5">
        <p className="text-sm font-bold text-gray-900 mb-1">Delivery Steps</p>
        <div className="divide-y divide-gray-50">
          <DoneStep label="Started Delivery" />
          <DoneStep label="Navigated to Address" />
          <DoneStep label="Arrived at Location" />
          <DoneStep label="Proof Uploaded" />
          {isCash && <DoneStep label="Cash Collected" />}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-brand-700">
            {isCash ? 'Payment Successful' : 'Delivery Completed'}
          </span>
        </div>
      </div>
    );
  }

  // ── DELIVERED, COD, cash not yet collected ───────────────────────────────────
  if (isDelivered && isCash && !cashCollected) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mt-5">
        <p className="text-sm font-bold text-gray-900 mb-1">Delivery Steps</p>
        <div className="divide-y divide-gray-50">
          <DoneStep label="Started Delivery" />
          <DoneStep label="Navigated to Address" />
          <DoneStep label="Arrived at Location" />
          <DoneStep label="Proof Uploaded" />
        </div>
        <div className="pt-4 mt-2">
          <button
            disabled={busy === 'collect-cash'}
            onClick={() =>
              act('collect-cash', async () => {
                await collectCashPayment(order.id);
                showSuccess('Cash collected successfully!');
              })
            }
            className="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 text-white hover:bg-amber-700 px-6 py-3.5 text-sm"
          >
            <Banknote size={16} />
            {busy === 'collect-cash' ? 'Collecting…' : 'Cash Collected'}
          </button>
        </div>
      </div>
    );
  }

  // ── ASSIGNED: only Start Delivery ───────────────────────────────────────────
  if (isAssigned) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mt-5">
        <p className="text-sm font-bold text-gray-900 mb-4">Delivery Steps</p>
        <PrimaryBtn
          onClick={() =>
            act('start', async () => {
              await startDelivery(order.id);
              showSuccess('Delivery started!');
            })
          }
          loading={busy === 'start'}
          icon={<Truck size={16} />}
        >
          Start Delivery
        </PrimaryBtn>
      </div>
    );
  }

  // ── OUT_FOR_DELIVERY: Navigate → Arrived → Upload Proof ─────────────────────
  if (isOFD) {

    if (arrivedDone) {
      return (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mt-5">
            <p className="text-sm font-bold text-gray-900 mb-1">Delivery Steps</p>
            <div className="divide-y divide-gray-50">
              <DoneStep label="Started Delivery" />
              <DoneStep label="Navigated to Address" />
              <DoneStep label="Arrived at Location" />
            </div>
            <div className="pt-4 mt-2">
              <PrimaryBtn
                onClick={() => navigate(`/partner/delivery-proof/${order.id}`)}
                icon={<Camera size={16} />}
              >
                Upload Delivery Proof
              </PrimaryBtn>
            </div>
          </div>
        </>
      );
    }

    // Navigate + Arrived phase
    return (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mt-5">
          <p className="text-sm font-bold text-gray-900 mb-1">Delivery Steps</p>
          <div className="divide-y divide-gray-50 mb-4">
            <DoneStep label="Started Delivery" />
          </div>
          <div className="space-y-3">
            {/* ── "Navigate Address" now opens the in-app map modal ── */}
            <SecondaryBtn
              onClick={() => {
                console.log('[OrderDetail] Navigate to Address clicked', {
                  orderId: order.id,
                  address: order.deliveryAddress,
                  orderLatitude: order.latitude,
                  orderLongitude: order.longitude,
                  hasCoords,
                  mapLat,
                  mapLng,
                });
                setMapOpen(true);
              }}
              icon={<Navigation size={15} />}
            >
              Navigate to Address
            </SecondaryBtn>

            <PrimaryBtn
              onClick={() =>
                act('arrived', async () => {
                  await markArrived(order.id);
                  setArrivedDone(true);
                  showSuccess('Arrival notification sent!');
                })
              }
              loading={busy === 'arrived'}
              icon={<Navigation size={15} />}
            >
              Mark as Arrived
            </PrimaryBtn>
          </div>
        </div>

        {/* ── Map modal rendered here, outside the card but inside the fragment ── */}
        <MapModal
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          latitude={mapLat}
          longitude={mapLng}
          address={order.deliveryAddress}
        />
      </>
    );
  }

  return null;
}

// ── Main page component ───────────────────────────────────────────────────────
export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate    = useNavigate();
  const { role }    = useAuth();

  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [busy, setBusy]               = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);

  const isCustomer        = role === 'CUSTOMER';
  const isDeliveryPartner = role === 'DELIVERY_PARTNER';

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await getOrder(orderId);
      setOrder(res.data);
      updateCachedOrder(orderId, {
        status:        res.data.status,
        paymentStatus: res.data.paymentStatus,
        amount:        res.data.amountDue,
      });
    } catch {
      showError('Could not load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string };
      showError(err?.message ?? 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (loading) return <Spinner />;

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Order not found</p>
        <Btn variant="ghost" onClick={() => navigate('/orders')}>← Back</Btn>
      </div>
    );
  }

  const s   = statusBadge[order.status];
  const p   = payBadge[order.paymentStatus];
  const cur = ORDER_STEPS.findIndex(step => step.key === order.status);

  const invoiceReady = order.status === 'DELIVERED';
  const canPayUpi =
    isCustomer &&
    order.paymentMethod !== 'CASH' &&
    order.paymentStatus === 'PENDING' &&
    !['DELIVERED', 'CANCELLED'].includes(order.status);

  const canCancel =
    isCustomer && ['PLACED', 'CONFIRMED', 'ASSIGNED'].includes(order.status);

  const refundStatus = order.payment?.refundStatus as RefundStatus | undefined;
  const showRefund   = refundStatus != null && refundStatus !== 'NOT_REQUIRED';
  const dbRetryCount = order.payment?.retryCount ?? 0;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-5 group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Orders
      </button>

      {/* Page title + status */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Order Details</h1>
          <p className="text-sm text-gray-500 mt-1">{fmtDateTime(order.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${s.cls}`}>
          {s.label}
        </span>
      </div>

      {/* Progress Timeline */}
      {order.status !== 'CANCELLED' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-5">
          <p className="text-sm font-bold text-gray-900 mb-8">Order Progress</p>
          <div className="relative flex items-start justify-between px-2">
            <div
              className="absolute h-[3px] bg-gray-200 rounded-full"
              style={{ top: '18px', left: '28px', right: '28px' }}
            />
            <div
              className="absolute h-[3px] bg-brand-600 rounded-full transition-all duration-500"
              style={{
                top: '18px',
                left: '28px',
                width: cur <= 0
                  ? '0%'
                  : `calc(${(cur / (ORDER_STEPS.length - 1)) * 100}% - ${(cur / (ORDER_STEPS.length - 1)) * 0}px)`,
                maxWidth: 'calc(100% - 56px)',
              }}
            />
            {ORDER_STEPS.map((step, i) => {
              const done    = i < cur;
              const current = i === cur;
              return (
                <div key={step.key} className="flex flex-col items-center relative z-10" style={{ width: '20%' }}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done    ? 'bg-brand-600 shadow-sm' :
                    current ? 'bg-brand-700 ring-4 ring-brand-100' :
                              'bg-white border-2 border-gray-300'
                  }`}>
                    {done    ? <CheckCircle2 size={17} className="text-white" strokeWidth={2.5} /> :
                     current ? <div className="w-3 h-3 rounded-full bg-white" /> :
                               null}
                  </div>
                  <p className={`text-xs mt-2.5 text-center leading-tight ${
                    done || current ? 'text-gray-900 font-semibold' : 'text-gray-400 font-medium'
                  }`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cash COD notice */}
      {order.paymentMethod === 'CASH' &&
        order.paymentStatus === 'PENDING' &&
        order.status !== 'PLACED' &&
        order.status !== 'CANCELLED' && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            {dbRetryCount >= 3
              ? 'Maximum UPI retry limit reached. This order will be paid via Cash on Delivery.'
              : 'This order will be paid via Cash on Delivery.'}
          </div>
        )}

      {/* Detail cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Package size={15} className="text-brand-600" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Order Details</p>
          </div>
          <dl className="space-y-3.5">
            <DetailRow label="Cylinder">{cylinderLabel[order.cylinderType]}</DetailRow>
            <DetailRow label="Quantity">{order.quantity}</DetailRow>
            <DetailRow label="Amount Due">
              <span className="font-bold text-gray-900">{money(order.amountDue)}</span>
            </DetailRow>
            <DetailRow label="Payment Method">{order.paymentMethod ?? '—'}</DetailRow>
            <DetailRow label="Payment"><Badge label={p.label} cls={p.cls} /></DetailRow>
            {showRefund && refundStatus && (
              <DetailRow label="Refund">
                <Badge label={refundBadge[refundStatus].label} cls={refundBadge[refundStatus].cls} />
              </DetailRow>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <MapPin size={15} className="text-brand-600" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Delivery Info</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{order.deliveryAddress}</p>
          {order.payment?.status === 'PENDING' && order.paymentMethod === 'UPI' && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={14} className="text-amber-500" />
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Status</p>
              </div>
              <p className="text-sm font-bold text-amber-600 mt-0.5">Pending Payment</p>
              <p className="text-xs text-gray-400 mt-0.5">Payment Method: UPI</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer actions */}
      {isCustomer && (
        <div className="flex flex-wrap gap-3">
          {canPayUpi && (
            <button
              onClick={() => setPaymentOpen(true)}
              className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 bg-brand-600 text-white hover:bg-brand-700 shadow-brand px-6 py-3 text-sm"
            >
              Pay UPI
            </button>
          )}
          {invoiceReady && (
            <button
              onClick={() => navigate(`/invoices/${order.id}`)}
              className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 bg-white text-brand-700 border-2 border-brand-200 hover:bg-brand-50 px-6 py-3 text-sm"
            >
              <FileText size={14} /> View Invoice
            </button>
          )}
          {canCancel && (
            <button
              disabled={busy === 'cancel'}
              onClick={() =>
                act('cancel', async () => {
                  await cancelOrder(order.id);
                  showSuccess('Order cancelled');
                  navigate('/orders');
                })
              }
              className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-red-600 border-2 border-red-200 hover:bg-red-50 px-6 py-3 text-sm"
            >
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
        </div>
      )}

      {/* Partner guided workflow */}
      {isDeliveryPartner && (
        <PartnerWorkflow order={order} busy={busy} act={act} navigate={navigate} />
      )}

      {/* Payment Modal */}
      <PaymentModal
        open={paymentOpen}
        amount={order.amountDue}
        orderId={order.id}
        retryCount={dbRetryCount}
        onClose={() => { setPaymentOpen(false); load(); }}
        onSuccess={async () => {
          await processPayment(order.id, 'UPI');
          showSuccess('Payment successful');
          await load();
        }}
        onRetry={async () => {
          const result = await retryPayment(order.id);
          if (result?.data?.convertedToCash) {
            showSuccess('Maximum retry limit reached. Please pay cash during delivery.');
          } else {
            showSuccess('Retry successful');
          }
          await load();
        }}
      />
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{children}</dd>
    </div>
  );
}