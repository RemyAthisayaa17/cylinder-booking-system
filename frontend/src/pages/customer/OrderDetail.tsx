import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
} from 'lucide-react';

import { showSuccess, showError } from '../../utils/toast';
import { getOrder, cancelOrder } from '../../services/orders';
import { processPayment, retryPayment, collectCashPayment } from '../../services/payments';
import { Btn, Badge, Spinner, Card } from '../../components/index';
import PaymentModal from '../../components/PaymentModal';

import {
  statusBadge,
  payBadge,
  money,
  fmtDateTime,
  shortId,
  cylinderLabel,
  updateCachedOrder,
} from '../../utils/helpers';

import { useAuth } from '../../context/AuthContext';
import type { Order, RefundStatus } from '../../types';

const STEPS = [
  'PLACED',
  'CONFIRMED',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

const refundBadge: Record<RefundStatus, { label: string; cls: string }> = {
  NOT_REQUIRED: { label: 'Not Required', cls: 'bg-gray-100 text-gray-500' },
  PENDING: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);

  const isCustomer = role === 'CUSTOMER';
  const isDeliveryPartner = role === 'DELIVERY_PARTNER';

  const load = useCallback(async () => {
    if (!orderId) return;

    try {
      const res = await getOrder(orderId);
      setOrder(res.data);

      updateCachedOrder(orderId, {
        status: res.data.status,
        paymentStatus: res.data.paymentStatus,
        amount: res.data.amountDue,
      });
    } catch {
      showError('Could not load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e: any) {
      showError(e?.message ?? 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (loading) return <Spinner />;

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Order not found</p>
        <Btn variant="ghost" onClick={() => navigate('/orders')}>
          ← Back
        </Btn>
      </div>
    );
  }

  const s = statusBadge[order.status];
  const p = payBadge[order.paymentStatus];
  const cur = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  // Show invoice button as soon as the order is DELIVERED (invoice generated automatically)
  const invoiceReady = order.status === 'DELIVERED';

  const canPayUpi =
    isCustomer &&
    order.paymentMethod !== 'CASH' &&
    order.paymentStatus === 'PENDING' &&
    !['DELIVERED', 'CANCELLED'].includes(order.status);

  const canCancel =
    isCustomer && ['PLACED', 'CONFIRMED'].includes(order.status);

  const refundStatus = order.payment?.refundStatus as RefundStatus | undefined;
  const showRefund = refundStatus != null && refundStatus !== 'NOT_REQUIRED';

  const dbRetryCount = order.payment?.retryCount ?? 0;

  // Delivery partner actions
  const delivery = order.deliveryTracking;
  const proofUploaded = delivery?.status === 'DELIVERED';

  const canUploadProof =
    isDeliveryPartner && order.status === 'OUT_FOR_DELIVERY';

  // CASH: collect only when OUT_FOR_DELIVERY and payment still PENDING
  const canCollectCash =
    isDeliveryPartner &&
    order.status === 'OUT_FOR_DELIVERY' &&
    order.paymentMethod === 'CASH' &&
    order.paymentStatus === 'PENDING';

  // Upload proof for CASH only after cash collected; UPI anytime OUT_FOR_DELIVERY
  const canUploadProofCashGated =
    isDeliveryPartner &&
    order.status === 'OUT_FOR_DELIVERY' &&
    (order.paymentMethod !== 'CASH' || order.paymentStatus === 'SUCCESS');

  return (
    <div className="max-w-2xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Btn
          variant="ghost"
          onClick={() => navigate(-1)}
          icon={<ArrowLeft size={16} />}
        >
          Back
        </Btn>

        <div className="flex-1">
          <h1 className="text-xl font-bold">Order #{shortId(order.id)}</h1>
          <p className="text-sm text-gray-500">{fmtDateTime(order.createdAt)}</p>
        </div>

        <Badge label={s.label} cls={s.cls} />
      </div>

      {/* PROGRESS */}
      {order.status !== 'CANCELLED' && (
        <Card className="mb-5">
          <p className="text-sm font-bold mb-5">Order Progress</p>

          <div className="flex justify-between">
            {STEPS.map((step, i) => {
              const done = i <= cur;

              return (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      done
                        ? 'bg-brand-600 border-brand-600'
                        : 'bg-white'
                    }`}
                  >
                    {done ? (
                      <CheckCircle size={12} className="text-white" />
                    ) : (
                      <Clock size={12} />
                    )}
                  </div>

                  <p className="text-xs mt-2 text-center">
                    {statusBadge[step].label}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CONVERTED TO CASH NOTICE */}
      {order.paymentMethod === 'CASH' &&
        order.paymentStatus === 'PENDING' &&
        order.status !== 'PLACED' && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            {dbRetryCount >= 3
              ? 'Maximum UPI retry limit reached. This order will be paid via Cash on Delivery.'
              : 'This order will be paid via Cash on Delivery.'}
          </div>
        )}

      {/* DETAILS */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <p className="font-bold mb-3 flex items-center gap-2">
            <Package size={14} /> Order Details
          </p>

          <dl className="space-y-2 text-sm">
            <Row label="Cylinder">{cylinderLabel[order.cylinderType]}</Row>
            <Row label="Quantity">{order.quantity}</Row>
            <Row label="Amount Due">
              <b>{money(order.amountDue)}</b>
            </Row>
            <Row label="Payment Method">{order.paymentMethod ?? '—'}</Row>
            <Row label="Payment">
              <Badge label={p.label} cls={p.cls} />
            </Row>
            {showRefund && refundStatus && (
              <Row label="Refund">
                <Badge
                  label={refundBadge[refundStatus].label}
                  cls={refundBadge[refundStatus].cls}
                />
              </Row>
            )}
          </dl>
        </Card>

        <Card>
          <p className="font-bold mb-3 flex items-center gap-2">
            <MapPin size={14} /> Delivery Info
          </p>

          <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
        </Card>
      </div>

      {/* CUSTOMER ACTIONS */}
      {isCustomer && (
        <Card className="mt-5">
          <p className="font-bold mb-3">Actions</p>

          <div className="flex gap-3 flex-wrap">
            {canPayUpi && (
              <Btn onClick={() => setPaymentOpen(true)}>Pay UPI</Btn>
            )}

            {invoiceReady && (
              <Btn
                variant="secondary"
                icon={<FileText size={13} />}
                onClick={() => navigate(`/invoices/${order.id}`)}
              >
                View Invoice
              </Btn>
            )}

            {canCancel && (
              <Btn
                loading={busy === 'cancel'}
                onClick={() =>
                  act('cancel', async () => {
                    await cancelOrder(order.id);
                    showSuccess('Order cancelled');
                    navigate('/orders');
                  })
                }
              >
                Cancel
              </Btn>
            )}

            <Btn variant="ghost" onClick={load} icon={<RefreshCw size={13} />}>
              Refresh
            </Btn>
          </div>
        </Card>
      )}

      {/* DELIVERY PARTNER ACTIONS */}
      {isDeliveryPartner && (
        <Card className="mt-5">
          <p className="font-bold mb-3">Delivery Actions</p>

          <div className="flex gap-3 flex-wrap">
            {/* STEP 1 for CASH: collect cash first */}
            {canCollectCash && (
              <Btn
                loading={busy === 'collect-cash'}
                onClick={() =>
                  act('collect-cash', async () => {
                    await collectCashPayment(order.id);
                    showSuccess('Cash collected successfully!');
                  })
                }
                className="bg-amber-600 text-white hover:bg-amber-700 btn px-5 py-2.5 text-sm"
              >
                Cash Collected
              </Btn>
            )}

            {/* STEP 2 for CASH (after collection), or direct for UPI */}
            {canUploadProofCashGated && (
              <Btn
                onClick={() =>
                  navigate(`/partner/delivery-proof/${order.id}`)
                }
              >
                Upload Proof
              </Btn>
            )}

            {/* Hint for cash orders */}
            {order.status === 'OUT_FOR_DELIVERY' &&
              order.paymentMethod === 'CASH' &&
              order.paymentStatus === 'PENDING' && (
                <p className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  ① Collect cash from customer → ② Upload delivery proof
                </p>
              )}

            <Btn variant="ghost" onClick={load} icon={<RefreshCw size={13} />}>
              Refresh
            </Btn>
          </div>
        </Card>
      )}

      {/* PAYMENT MODAL */}
      <PaymentModal
        open={paymentOpen}
        amount={order.amountDue}
        orderId={order.id}
        retryCount={dbRetryCount}
        onClose={() => {
          setPaymentOpen(false);
          load();
        }}
        onSuccess={async () => {
          await processPayment(order.id, 'UPI');
          showSuccess('Payment successful');
          await load();
        }}
        onRetry={async () => {
          const result = await retryPayment(order.id);
          if (result?.data?.convertedToCash) {
            showSuccess(
              'Maximum retry limit reached. Please pay cash during delivery.'
            );
          } else {
            showSuccess('Retry successful');
          }
          await load();
        }}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}