import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, ChevronRight, FileText } from 'lucide-react';
import { Btn, Empty, Badge, Spinner } from '../../components/index';
import { statusBadge, payBadge, money, fmtDate, shortId, cylinderLabel } from '../../utils/helpers';
import { getMyOrders } from '../../services/orders';
import type { Order, OrderStatus } from '../../types';
import { showError } from '../../utils/toast';

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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">My Orders</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
          </p>
        </div>
        <Btn onClick={() => navigate('/orders/new')} icon={<Plus size={14} />}>
          New Order
        </Btn>
      </div>

      {/* Search + Filter Bar — single compact card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 mb-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Order ID or Address…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                filter === f.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card">
          <Empty
            icon={<Package size={24} />}
            title={search || filter !== 'ALL' ? 'No matching orders' : 'No orders yet'}
            sub={search || filter !== 'ALL' ? 'Try adjusting your filters' : 'Place your first order'}
            action={
              !search && filter === 'ALL'
                ? <Btn onClick={() => navigate('/orders/new')} icon={<Plus size={14} />}>Book Cylinder</Btn>
                : undefined
            }
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {shown.map(o => {
            const s = statusBadge[o.status];
            const p = payBadge[o.paymentStatus];
            const hasInvoice = !!o.invoice || o.status === 'DELIVERED';
            return (
              <div
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                className="bg-white rounded-xl border border-gray-100 shadow-card cursor-pointer hover:shadow-soft hover:border-brand-100 transition-all duration-200 group overflow-hidden"
              >
                {/* Status accent bar */}
                <div className={`h-0.5 w-full ${
                  o.status === 'DELIVERED'        ? 'bg-emerald-400' :
                  o.status === 'CANCELLED'        ? 'bg-red-400' :
                  o.status === 'OUT_FOR_DELIVERY' ? 'bg-amber-400' :
                  o.status === 'ASSIGNED'         ? 'bg-orange-400' :
                  'bg-brand-400'
                }`} />

                <div className="p-4">
                  {/* Top row: icon + name + chevron */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">
                          {cylinderLabel[o.cylinderType]}
                        </p>
                        <p className="text-xs text-gray-400">#{shortId(o.id)}</p>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                  </div>

                  {/* Address */}
                  <p className="text-xs text-gray-500 mb-3 truncate">
                    {o.deliveryAddress}
                  </p>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <Badge label={s.label} cls={s.cls} />
                    <Badge label={p.label} cls={p.cls} />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="text-sm font-bold text-gray-900">{money(o.amountDue)}</span>
                    <div className="flex items-center gap-2.5">
                      {hasInvoice && (
                        <button
                          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                          onClick={e => { e.stopPropagation(); navigate(`/invoices/${o.id}`); }}
                        >
                          <FileText size={11} /> Invoice
                        </button>
                      )}
                      <span className="text-xs text-gray-400">{fmtDate(o.createdAt)}</span>
                    </div>
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