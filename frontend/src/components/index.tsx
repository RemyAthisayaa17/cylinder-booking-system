import { Loader2 } from 'lucide-react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
}
export function Btn({
  variant = 'primary', loading, icon, children, className = '', disabled, ...rest
}: BtnProps) {
  const base = 'btn';
  const v = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn bg-red-600 text-white hover:bg-red-700 px-5 py-2.5 text-sm',
  }[variant];
  return (
    <button className={`${base} ${v} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={size} className="animate-spin text-brand-600" />
    </div>
  );
}

// ── Empty ─────────────────────────────────────────────────────────────────────
export function Empty({
  icon, title, sub, action,
}: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-400 mb-4">
        {icon}
      </div>
      <p className="font-semibold text-gray-800 mb-1">{title}</p>
      {sub && <p className="text-sm text-gray-500 mb-5 max-w-xs">{sub}</p>}
      {action}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children, className = '', onClick,
}: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`card ${onClick ? 'cursor-pointer hover:shadow-soft transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({
  icon, iconBg, title, value, sub,
}: { icon: ReactNode; iconBg: string; title: string; value: string | number; sub?: string }) {
  return (
    <div className="card hover:shadow-soft transition-shadow">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}