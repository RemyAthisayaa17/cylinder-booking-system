import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import {
  Truck,
  ChevronRight,
  Camera,
  CheckCircle,
  Navigation,
  Banknote,
} from 'lucide-react';
import { getMyOrders, startDelivery, markArrived } from '../../services/delivery';
import { collectCashPayment } from '../../services/payments';
import {
  Btn,
  Spinner,
  Empty,
  Badge,
  PageHeader,
} from '../../components/index';
import {
  statusBadge,
  cylinderLabel,
  shortId,
  fmtDate,
  money,
} from '../../utils/helpers';
import type { Order } from '../../types';

export default function PartnerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  function load() {
    setLoading(true);
    getMyOrders()
      .then((res) => setOrders(res.data ?? []))
      .catch(() => showError('Could not load orders'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      load();
    } catch (e: any) {
      showError(e?.message ?? 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        sub={`${orders.length} assigned orders`}
      />

      {orders.length === 0 ? (
        <div className="card">
          <Empty
            icon={<Truck size={26} />}
            title="No deliveries assigned"
            sub="Your assigned orders appear here"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const s = statusBadge[o.status];

            // CASH: show "Cash Collected" button when cash not yet collected
            const showCashCollect =
  o.status === 'DELIVERED' &&
  o.paymentMethod === 'CASH' &&
  o.paymentStatus === 'PENDING';
            
          const showUploadProof =
  o.status === 'OUT_FOR_DELIVERY';

            return (
              <div
                key={o.id}
                className="card border border-gray-100 hover:shadow-soft transition-all"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Truck size={17} className="text-brand-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">
                        Order #{shortId(o.id)}
                      </p>
                      <Badge label={s.label} cls={s.cls} />
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {cylinderLabel[o.cylinderType]} × {o.quantity}
                    </p>

                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {o.deliveryAddress}
                    </p>

                    {o.customer && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {o.customer.name} · {o.customer.phone}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">
                        {fmtDate(o.createdAt)}
                      </p>

                      {o.paymentMethod && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.paymentMethod === 'CASH'
                              ? o.paymentStatus === 'SUCCESS'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                              : o.paymentStatus === 'SUCCESS'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {o.paymentMethod === 'CASH'
                            ? o.paymentStatus === 'SUCCESS'
                              ? '✓ Cash Collected'
                              : 'Cash on Delivery'
                            : o.paymentStatus === 'SUCCESS'
                            ? '✓ UPI Paid'
                            : 'UPI Pending'}
                        </span>
                      )}

                      {o.amountDue > 0 && (
                        <p className="text-xs font-semibold text-gray-700">
                          {money(o.amountDue)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">

                  {/* START DELIVERY — only when ASSIGNED */}
                  {o.status === 'ASSIGNED' && (
                    <Btn
                      loading={busy === `start-${o.id}`}
                      icon={<Truck size={13} />}
                      onClick={() =>
                        act(`start-${o.id}`, () =>
                          startDelivery(o.id).then(() =>
                            showSuccess('Delivery started!')
                          )
                        )
                      }
                    >
                      Start Delivery
                    </Btn>
                  )}

                  {/* NAVIGATE */}
                  {(o.status === 'ASSIGNED' ||
                    o.status === 'OUT_FOR_DELIVERY') && (
                    <Btn
                      variant="ghost"
                      icon={<Navigation size={13} />}
                      onClick={() => {
                        const hasValidCoords =
                          typeof o.latitude === 'number' &&
                          typeof o.longitude === 'number' &&
                          !(o.latitude === 0 && o.longitude === 0);
                        const url = hasValidCoords
                          ? `https://www.openstreetmap.org/?mlat=${o.latitude}&mlon=${o.longitude}#map=18/${o.latitude}/${o.longitude}`
                          : `https://www.openstreetmap.org/search?query=${encodeURIComponent(o.deliveryAddress)}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Navigate
                    </Btn>
                  )}

                  {/* ARRIVED */}
                  {o.status === 'OUT_FOR_DELIVERY' && (
                    <Btn
                      loading={busy === `arrived-${o.id}`}
                      icon={<Navigation size={13} />}
                      onClick={() =>
                        act(`arrived-${o.id}`, async () => {
                          await markArrived(o.id);
                          showSuccess('Arrival notification sent to customer');
                        })
                      }
                    >
                      Arrived
                    </Btn>
                  )}

                  {/* CASH COLLECTED — step 1 for CASH orders */}
                  {showCashCollect && (
                    <Btn
                      loading={busy === `cash-${o.id}`}
                      icon={<Banknote size={13} />}
                      onClick={() =>
                        act(`cash-${o.id}`, async () => {
                          await collectCashPayment(o.id);
                          showSuccess('Cash collected successfully!');
                        })
                      }
                      className="bg-amber-600 text-white hover:bg-amber-700 btn px-5 py-2.5 text-sm"
                    >
                      Cash Collected
                    </Btn>
                  )}

                  {/* UPLOAD PROOF */}
                  {showUploadProof && (
                    <Btn
                      icon={<Camera size={13} />}
                      onClick={() =>
                        navigate(`/partner/delivery-proof/${o.id}`)
                      }
                    >
                      Upload Proof
                    </Btn>
                  )}

                  {/* Hint for cash orders awaiting collection */}
                  {showCashCollect && (
                    <p className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-1">
                      ① Collect cash from customer → ② Upload delivery proof
                    </p>
                  )}

                  {o.status === 'DELIVERED' && (
                    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle size={13} />
                      Completed
                    </span>
                  )}

                  <Btn
                    variant="ghost"
                    icon={<ChevronRight size={13} />}
                    onClick={() => navigate(`/orders/${o.id}`)}
                  >
                    View Details
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}