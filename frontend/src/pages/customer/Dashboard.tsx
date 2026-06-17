import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Flame, ArrowRight, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Btn, Empty, Badge, Spinner } from '../../components/index';
import { statusBadge, payBadge, money, fmtDate, fmtDateTime, shortId, cylinderLabel } from '../../utils/helpers';
import { getMyOrders, getEligibility } from '../../services/orders';
import type { Order } from '../../types';
import type { EligibilityResult } from '../../services/orders';
import { showSuccess, showError } from '../../utils/toast';


export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]             = useState<Order[]>([]);
  const [eligibility, setEligibility]   = useState<EligibilityResult | null>(null);
  const [loadingOrders, setLoadingOrders]       = useState(true);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then(res => setOrders(res.data))
      .catch(() => showError('Could not load orders'))
      .finally(() => setLoadingOrders(false));

    getEligibility()
      .then(res => setEligibility(res.data))
      .catch(() => {/* non-critical */})
      .finally(() => setLoadingEligibility(false));
  }, []);

  const latestOrder = orders[0] ?? null;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-brand-200 text-sm">
              <Flame size={15} /> Gas Cylinder Booking
            </div>
            <h2 className="text-2xl font-bold mb-1">Hello, {user?.name?.split(' ')[0]}!</h2>
            <p className="text-brand-200 text-sm">Need a refill? Book your cylinder now.</p>
          </div>
          <Btn
            onClick={() => navigate('/orders/new')}
            className="bg-white text-brand-700 hover:bg-brand-50 border-0 shadow-none flex-shrink-0"
            icon={<ArrowRight size={14} />}
          >
            Book Cylinder
          </Btn>
        </div>
      </div>

      {/* Eligibility card */}
      {!loadingEligibility && eligibility && (
        <div className={`rounded-2xl border p-5 flex items-start gap-4 ${
          eligibility.eligible
            ? 'bg-green-50 border-green-100'
            : 'bg-amber-50 border-amber-100'
        }`}>
          {eligibility.eligible
            ? <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-semibold ${eligibility.eligible ? 'text-green-800' : 'text-amber-800'}`}>
              {eligibility.eligible ? 'Eligible to Book' : 'Not Yet Eligible'}
            </p>
            <p className={`text-xs mt-0.5 ${eligibility.eligible ? 'text-green-700' : 'text-amber-700'}`}>
              {eligibility.message}
            </p>
          </div>
        </div>
      )}

      {/* Recent order */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
          {orders.length > 0 && (
            <button onClick={() => navigate('/orders')} className="text-sm text-brand-600 hover:underline">
              View all →
            </button>
          )}
        </div>

        {loadingOrders ? (
          <Spinner />
        ) : !latestOrder ? (
          <div className="card">
            <Empty
              icon={<Package size={26} />}
              title="No orders yet"
              sub="Book your first gas cylinder and it will appear here"
              action={<Btn onClick={() => navigate('/orders/new')}>Book Now</Btn>}
            />
          </div>
        ) : (
          <LatestOrderCard
            order={latestOrder}
            onClick={() => navigate(`/orders/${latestOrder.id}`)}
            onInvoice={() => navigate(`/invoices/${latestOrder.id}`)}
          />
        )}
      </div>
    </div>
  );
}

function LatestOrderCard({
  order,
  onClick,
  onInvoice,
}: {
  order: Order;
  onClick: () => void;
  onInvoice: () => void;
}) {
  const s = statusBadge[order.status];
  const p = payBadge[order.paymentStatus];
  const hasInvoice = !!order.invoice || order.status === 'DELIVERED';

  return (
    <div className="card border hover:shadow-soft hover:border-brand-100 transition-all">
      {/* Header row */}
      <div
        className="flex items-start justify-between mb-3 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <Package size={16} className="text-brand-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">#{shortId(order.id)}</p>
            <p className="text-sm font-semibold text-gray-900">{cylinderLabel[order.cylinderType]}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-gray-900">{money(order.amountDue)}</span>
      </div>

      <p className="text-xs text-gray-500 mb-3 truncate">{order.deliveryAddress}</p>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
        <Badge label={s.label} cls={s.cls} />
        <Badge label={p.label} cls={p.cls} />
        <span className="ml-auto text-xs text-gray-400">{fmtDateTime(order.createdAt)}</span>
      </div>

      {hasInvoice && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <Btn
            variant="secondary"
            icon={<FileText size={13} />}
            onClick={(e) => { e.stopPropagation(); onInvoice(); }}
          >
            View Invoice
          </Btn>
        </div>
      )}
    </div>
  );
}