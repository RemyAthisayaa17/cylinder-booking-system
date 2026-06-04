import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, MapPin, CreditCard,
  CheckCircle, Clock, FileText, RefreshCw, RotateCcw,
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { getOrder, cancelOrder } from '../../services/orders';
import { processPayment, retryPayment } from '../../services/payments';
import { Btn, Badge, Spinner, Card } from '../../components/index';
import PaymentModal from '../../components/PaymentModal';
import {
  statusBadge, payBadge, money, fmtDateTime,
  shortId, cylinderLabel, updateCachedOrder,
} from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import type { Order, RefundStatus } from '../../types';

const STEPS = [
  'PLACED', 'CONFIRMED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED',
] as const;

const refundBadge: Record<RefundStatus, { label: string; cls: string }> = {
  NOT_REQUIRED: { label: 'Not Required', cls: 'bg-gray-100 text-gray-500' },
  PENDING:      { label: 'Pending',      cls: 'bg-yellow-100 text-yellow-700' },
  COMPLETED:    { label: 'Completed',    cls: 'bg-green-100 text-green-700' },
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
        <Btn variant="ghost" onClick={() => navigate('/orders')}>← Back</Btn>
      </div>
    );
  }

  const s = statusBadge[order.status];
  const p = payBadge[order.paymentStatus];
  const cur = STEPS.indexOf(order.status as typeof STEPS[number]);

  const invoiceReady =
    order.paymentStatus === 'SUCCESS' && order.status === 'DELIVERED';

  // UPI only — cash has no customer-side payment action
  const canPayUpi =
    isCustomer &&
    order.paymentMethod !== 'CASH' &&
    order.paymentStatus === 'PENDING' &&
    !['DELIVERED', 'CANCELLED'].includes(order.status);

  const canCancel =
    isCustomer &&
    ['PLACED', 'CONFIRMED'].includes(order.status);

  const refundStatus = order.payment?.refundStatus as RefundStatus | undefined;
  const showRefund = refundStatus != null && refundStatus !== 'NOT_REQUIRED';

  // DB retry count — passed to modal as source of truth
  const dbRetryCount = order.payment?.retryCount ?? 0;

  return (
    <div className="max-w-2xl mx-auto">

      <div className="flex items-center gap-3 mb-6">
        <Btn variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={16} />}>
          Back
        </Btn>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Order #{shortId(order.id)}</h1>
          <p className="text-sm text-gray-500">{fmtDateTime(order.createdAt)}</p>
        </div>
        <Badge label={s.label} cls={s.cls} />
      </div>

      {order.status !== 'CANCELLED' && (
        <Card className="mb-5">
          <p className="text-sm font-bold text-gray-800 mb-5">Order Progress</p>
          <div className="flex justify-between relative">
            {STEPS.map((step, i) => {
              const done    = i <= cur;
              const current = i === cur;
              return (
                <div key={step} className="flex flex-col items-center flex-1 relative">
                  {i < STEPS.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${i < cur ? 'bg-brand-500' : 'bg-gray-100'}`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    done ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-200'
                  } ${current ? 'ring-4 ring-brand-100' : ''}`}>
                    {done
                      ? <CheckCircle size={13} className="text-white" />
                      : <Clock size={13} className="text-gray-300" />}
                  </div>
                  <p className={`text-xs mt-2 font-medium text-center leading-tight ${done ? 'text-brand-600' : 'text-gray-400'}`}>
                    {statusBadge[step].label}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={14} className="text-brand-600" /> Order Details
          </p>
          <dl className="space-y-2.5 text-sm">
            <Row label="Cylinder">{cylinderLabel[order.cylinderType]}</Row>
            <Row label="Quantity">{order.quantity}</Row>
            <Row label="Amount Due">
              <span className="font-bold text-brand-700">{money(order.amountDue)}</span>
            </Row>
            {order.amountPaid > 0 && (
              <Row label="Amount Paid">
                <span className="text-green-700 font-semibold">{money(order.amountPaid)}</span>
              </Row>
            )}
            <Row label="Payment Method">{order.paymentMethod ?? '—'}</Row>
            <Row label="Payment"><Badge label={p.label} cls={p.cls} /></Row>
            {order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING' && (
              <Row label="">
                <span className="text-xs text-amber-600 font-medium">
                  Cash collected by delivery partner on delivery
                </span>
              </Row>
            )}
          </dl>
        </Card>

        <Card>
          <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-brand-600" /> Delivery Info
          </p>
          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="text-gray-400 text-xs mb-0.5">Address</dt>
              <dd className="font-medium text-gray-800">{order.deliveryAddress}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {showRefund && order.payment && (
        <Card className="mt-5 border border-yellow-100 bg-yellow-50/40">
          <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <RotateCcw size={14} className="text-yellow-600" /> Refund Details
          </p>
          <dl className="space-y-2.5 text-sm">
            <Row label="Refund Status">
              <Badge label={refundBadge[refundStatus!].label} cls={refundBadge[refundStatus!].cls} />
            </Row>
            {order.payment.refundInitiatedAt && (
              <Row label="Initiated At">{fmtDateTime(order.payment.refundInitiatedAt)}</Row>
            )}
            {order.payment.refundCompletedAt && (
              <Row label="Completed At">{fmtDateTime(order.payment.refundCompletedAt)}</Row>
            )}
            <Row label="Refund Amount">
              <span className="font-semibold text-gray-900">{money(order.payment.amount)}</span>
            </Row>
          </dl>
          {refundStatus === 'PENDING' && (
            <p className="mt-4 text-xs text-yellow-700 bg-yellow-100 rounded-xl px-3 py-2">
              Refund initiated successfully. Expected processing time: 24-48 hours.
            </p>
          )}
          {refundStatus === 'COMPLETED' && (
            <p className="mt-4 text-xs text-green-700 bg-green-100 rounded-xl px-3 py-2">
              Your refund has been processed successfully.
            </p>
          )}
        </Card>
      )}

      {isCustomer && (
        <Card className="mt-5">
          <p className="text-sm font-bold text-gray-800 mb-4">Actions</p>
          <div className="flex flex-wrap gap-3">

            {canPayUpi && (
              <Btn icon={<CreditCard size={14} />} onClick={() => setPaymentOpen(true)}>
                Process UPI Payment
              </Btn>
            )}

            {invoiceReady && (
              <Btn
                variant="secondary"
                icon={<FileText size={14} />}
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
                    const res = await cancelOrder(order.id);
                    if (res.data.refundMessage) {
                      showSuccess(res.data.refundMessage);
                    } else {
                      showSuccess('Order cancelled successfully');
                    }
                    navigate('/orders');
                  })
                }
              >
                Cancel Order
              </Btn>
            )}

            <Btn variant="ghost" onClick={load} icon={<RefreshCw size={14} />}>
              Refresh
            </Btn>
          </div>
        </Card>
      )}

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
          showSuccess('Payment successful!');
          await load();
        }}
        onRetry={async () => {
          await retryPayment(order.id);
          showSuccess('Payment retry successful!');
          await load();
        }}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 text-right">{children}</dd>
    </div>
  );
}