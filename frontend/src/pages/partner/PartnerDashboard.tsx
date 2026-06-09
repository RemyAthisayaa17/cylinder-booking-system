import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ChevronRight } from 'lucide-react';
import { getMyOrders } from '../../services/delivery';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Empty, Badge } from '../../components/index';
import { statusBadge, cylinderLabel, shortId, fmtDate } from '../../utils/helpers';
import type { Order } from '../../types';
import {  showError } from '../../utils/toast';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then(res => setOrders(res.data))
      .catch(() => showError('Could not load orders'))
      .finally(() => setLoading(false));
  }, []);

  const active = orders.filter(o =>
    ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(o.status)
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2 text-brand-200 text-sm">
            <Truck size={15} /> Delivery Partner
          </div>
          <h2 className="text-2xl font-bold mb-1">Hello, {user?.name?.split(' ')[0]}!</h2>
          <p className="text-brand-200 text-sm">Manage your assigned deliveries below.</p>
        </div>
      </div>

      {/* Assigned orders only — no stat cards */}
      <div>
        <h2 className="font-bold text-gray-900 mb-4">Assigned Orders</h2>
        {loading ? (
          <Spinner />
        ) : active.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Truck size={26} />}
              title="No active deliveries"
              sub="Assigned deliveries will appear here"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(o => (
              <OrderRow key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const s = statusBadge[order.status];
  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:shadow-soft hover:border-brand-100 border transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Truck size={17} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Order #{shortId(order.id)} · {cylinderLabel[order.cylinderType]}
          </p>
          <p className="text-xs text-gray-500 truncate">{order.deliveryAddress}</p>
          {order.customer && (
            <p className="text-xs text-gray-400">
              {order.customer.name} · {order.customer.phone}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Badge label={s.label} cls={s.cls} />
          <p className="text-xs text-gray-400">{fmtDate(order.createdAt)}</p>
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-400 flex-shrink-0" />
      </div>
    </div>
  );
}