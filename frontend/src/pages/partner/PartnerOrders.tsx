import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError } from '../../utils/toast';
import {
  Truck,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { getMyOrders } from '../../services/delivery';
import { Spinner, Empty, Badge, PageHeader } from '../../components/index';
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

  function load() {
    setLoading(true);
    getMyOrders()
      .then((res) => setOrders(res.data ?? []))
      .catch(() => showError('Could not load orders'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Orders"
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
            const isCompleted = o.status === 'DELIVERED';
          
            const isCancelled = o.status === 'CANCELLED';

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-card transition-all"
              >
                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? 'bg-emerald-50' : 'bg-brand-50'
                    }`}>
                      {isCompleted
                        ? <CheckCircle2 size={18} className="text-emerald-600" />
                        : <Truck size={17} className="text-brand-600" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">
                          Order #{shortId(o.id)}
                        </p>
                        <Badge label={s.label} cls={s.cls} />
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {cylinderLabel[o.cylinderType]} · Qty: {o.quantity}
                      </p>

                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {o.deliveryAddress}
                      </p>

                      {o.customer && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {o.customer.name} · {o.customer.phone}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">{fmtDate(o.createdAt)}</span>
                        {o.paymentMethod && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.paymentMethod === 'CASH'
                              ? o.paymentStatus === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                              : o.paymentStatus === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {o.paymentMethod === 'CASH'
                              ? o.paymentStatus === 'SUCCESS' ? '✓ Cash Collected' : 'Cash on Delivery'
                              : o.paymentStatus === 'SUCCESS' ? '✓ UPI Paid'       : 'UPI Pending'}
                          </span>
                        )}
                        {o.amountDue > 0 && (
                          <span className="text-xs font-semibold text-gray-700">{money(o.amountDue)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions — list page: navigate to detail page only. All workflow actions live inside OrderDetail. */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                    {isCompleted ? (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Delivery Completed
                      </span>
                    ) : isCancelled ? null : (
                      <button
                        onClick={() => navigate(`/orders/${o.id}`)}
                        className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 bg-brand-700 text-white hover:bg-brand-800 shadow-brand px-4 py-2.5 text-xs"
                      >
                        <Truck size={13} />
                        Continue Delivery
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 active:scale-95 text-gray-500 hover:text-brand-600 hover:bg-brand-50 px-4 py-2.5 text-xs border border-gray-200"
                    >
                      <ChevronRight size={13} />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}