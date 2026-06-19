import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError } from '../../utils/toast';
import { Truck, ChevronRight, CheckCircle2, MapPin } from 'lucide-react';
import { getMyOrders } from '../../services/delivery';
import { Spinner, Empty, PageHeader } from '../../components/index';
import {
  statusBadge,
  cylinderLabel,
  shortId,
  fmtDate,
  money,
} from '../../utils/helpers';
import type { Order } from '../../types';

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: Order['status'] }) {
  const s = statusBadge[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

/* ─── Single order card ──────────────────────────────────────────────────── */
function OrderCard({ o, onNavigate }: { o: Order; onNavigate: (id: string) => void }) {
  const isCompleted = o.status === 'DELIVERED';
  const isCancelled = o.status === 'CANCELLED';

  /* Shorten address: keep first two comma-separated segments */
  const shortAddr = o.deliveryAddress
    .split(',')
    .slice(0, 2)
    .join(',')
    .trim();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      {/* ── Info block ── */}
      <div className="p-5 space-y-3">

        {/* Row 1: ID + status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900 tracking-tight">
            #{shortId(o.id)}
          </span>
          <StatusPill status={o.status} />
        </div>

        {/* Row 2: Address */}
        <p className="flex items-start gap-1.5 text-sm text-gray-600 leading-snug">
          <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <span className="truncate">{shortAddr}</span>
        </p>

        {/* Row 3: Cylinder · Date */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{cylinderLabel[o.cylinderType]} × {o.quantity}</span>
          <span>{fmtDate(o.createdAt)}</span>
        </div>

        {/* Row 4: Amount due (only if > 0) */}
        {o.amountDue > 0 && (
          <p className="text-sm font-semibold text-gray-800">
            {money(o.amountDue)}
          </p>
        )}
      </div>

      {/* ── Action strip ── */}
      <div className="px-5 pb-4">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <CheckCircle2 size={13} />
            Delivered
          </span>
        ) : isCancelled ? (
          <button
            onClick={() => onNavigate(o.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500"
          >
            <ChevronRight size={13} />
            View Details
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(o.id)}
              className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 bg-brand-700 text-white hover:bg-brand-800 shadow-brand px-4 py-2.5 text-xs"
            >
              <Truck size={13} />
              Continue Delivery
            </button>
            <button
              onClick={() => onNavigate(o.id)}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 active:scale-95 text-gray-500 hover:text-brand-600 hover:bg-brand-50 px-3 py-2.5 text-xs border border-gray-200"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
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
        sub={`${orders.length} assigned order${orders.length !== 1 ? 's' : ''}`}
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
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} onNavigate={(id) => navigate(`/orders/${id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}