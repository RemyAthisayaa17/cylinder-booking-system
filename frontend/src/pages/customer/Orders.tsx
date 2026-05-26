import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, ChevronRight, FileText } from 'lucide-react';
import { Btn, Empty, Badge, PageHeader, Spinner } from '../../components/index';
import { statusBadge, payBadge, money, fmtDate, shortId, cylinderLabel } from '../../utils/helpers';
import { getMyOrders } from '../../services/orders';
import type { Order, OrderStatus } from '../../types';
import { showSuccess, showError } from '../../utils/toast';

const FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All',              value: 'ALL' },
  { label: 'Placed',           value: 'PLACED' },
  { label: 'Confirmed',        value: 'CONFIRMED' },
  { label: 'Assigned',         value: 'ASSIGNED' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered',        value: 'DELIVERED' },
  { label: 'Cancelled',        value: 'CANCELLED' },
];

export default function Orders() {
  const navigate = useNavigate();
  const [filter, setFilter]   = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch]   = useState('');
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then(res => setOrders(res.data))
      .catch(() => showError('Could not load orders'))
      .finally(() => setLoading(false));
  }, []);

  const shown = orders.filter(o => {
    const okStatus = filter === 'ALL' || o.status === filter;
    const okSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.deliveryAddress.toLowerCase().includes(search.toLowerCase());
    return okStatus && okSearch;
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Orders"
        sub={`${orders.length} total`}
        action={<Btn onClick={() => navigate('/orders/new')} icon={<Plus size={14} />}>New Order</Btn>}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order ID or address…"
          className="input pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <Empty
            icon={<Package size={26} />}
            title={search || filter !== 'ALL' ? 'No matching orders' : 'No orders yet'}
            sub={search || filter !== 'ALL' ? 'Try adjusting filters' : 'Place your first order'}
            action={
              !search && filter === 'ALL'
                ? <Btn onClick={() => navigate('/orders/new')} icon={<Plus size={14} />}>Book Cylinder</Btn>
                : undefined
            }
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {shown.map(o => {
            const s = statusBadge[o.status];
            const p = payBadge[o.paymentStatus];
            const hasInvoice = !!o.invoice || o.status === 'DELIVERED';
            return (
              <div
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                className="card cursor-pointer hover:shadow-soft hover:border-brand-100 border transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                      <Package size={15} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">#{shortId(o.id)}</p>
                      <p className="text-sm font-semibold text-gray-900">{cylinderLabel[o.cylinderType]}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-400 mt-1" />
                </div>
                <p className="text-xs text-gray-500 mb-3 truncate">{o.deliveryAddress}</p>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                  <Badge label={s.label} cls={s.cls} />
                  <Badge label={p.label} cls={p.cls} />
                  <span className="ml-auto text-xs text-gray-400">{fmtDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm font-bold text-gray-900">{money(o.amountDue)}</p>
                  {hasInvoice && (
                    <button
                      className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      onClick={e => { e.stopPropagation(); navigate(`/invoices/${o.id}`); }}
                    >
                      <FileText size={12} /> Invoice
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}