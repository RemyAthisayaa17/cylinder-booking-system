import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import { Truck, ChevronRight, CheckCircle } from 'lucide-react';
import { getMyOrders, startDelivery, completeDelivery } from '../../services/delivery';
import { Btn, Spinner, Empty, Badge, PageHeader } from '../../components/index';
import { statusBadge, cylinderLabel, shortId, fmtDate } from '../../utils/helpers';
import type { Order } from '../../types';

export default function PartnerOrders() {
  const navigate  = useNavigate();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState('');
  
  function load() {
    setLoading(true);
    // GET /api/delivery/my-orders — JWT identifies partner server-side
    getMyOrders()
      .then(res => setOrders(res.data))
      .catch(() => showError('Could not load orders'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try { await fn(); load(); }
    catch (e: any) { showError(e?.message ?? 'Action failed'); }
    finally { setBusy(''); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Deliveries" sub={`${orders.length} assigned orders`} />

      {orders.length === 0 ? (
        <div className="card">
          <Empty icon={<Truck size={26} />} title="No deliveries assigned" sub="Your assigned orders appear here" />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const s = statusBadge[o.status];
            return (
              <div key={o.id} className="card border border-gray-100 hover:shadow-soft transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Truck size={17} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Order #{shortId(o.id)}</p>
                      <Badge label={s.label} cls={s.cls} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{cylinderLabel[o.cylinderType]} × {o.quantity}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{o.deliveryAddress}</p>
                    {o.customer && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {o.customer.name} · {o.customer.phone}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(o.createdAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                  {/* Start delivery — requires ASSIGNED */}
                  {o.status === 'ASSIGNED' && (
                    <Btn
                      loading={busy === `start-${o.id}`}
                      icon={<Truck size={13} />}
                      onClick={() => act(`start-${o.id}`, () =>
                        startDelivery(o.id).then(() => showSuccess('Delivery started!'))
                      )}
                    >
                      Start Delivery
                    </Btn>
                  )}

                  {/* Complete delivery — requires OUT_FOR_DELIVERY */}
                  {o.status === 'OUT_FOR_DELIVERY' && (
                    <Btn
                      loading={busy === `done-${o.id}`}
                      icon={<CheckCircle size={13} />}
                      onClick={() => act(`done-${o.id}`, () =>
                        completeDelivery(o.id).then(() => showSuccess('Delivery completed!'))
                      )}
                    >
                      Mark Delivered
                    </Btn>
                  )}

                  {o.status === 'DELIVERED' && (
                    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle size={13} /> Completed
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