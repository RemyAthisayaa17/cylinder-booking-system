import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import http from '../../api/http';
import type { Customer as BaseCustomer } from '../../types';

type Customer = BaseCustomer & { email?: string };

export default function Profile() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/api/auth/me')
      .then((r) => setCustomer(r.data?.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const customerTypeLabel: Record<string, string> = {
    DOMESTIC: 'Domestic',
    COMMERCIAL: 'Commercial',
  };

  const areaTypeLabel: Record<string, string> = {
    URBAN: 'Urban',
    RURAL: 'Rural',
  };

  const initials = user?.name?.[0]?.toUpperCase() ?? '?';

  const Field = ({
    label,
    value,
    green,
  }: {
    label: string;
    value?: string | null;
    green?: boolean;
  }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-sm font-semibold text-right ${
          value
            ? green
              ? 'text-emerald-600'
              : 'text-gray-900'
            : 'text-gray-300'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Profile</h1>
        <p className="text-xs text-gray-400 mt-0.5">Your account details and address</p>
      </div>

      <div className="space-y-4">

        {/* Identity card */}
        <div className="card flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-brand-600 to-brand-800 shadow-brand"
          >
            <span className="text-base font-bold text-white leading-none">{initials}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-gray-900 leading-tight truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">+91 {user?.phone}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium truncate">
              {loading ? '' : (customer?.email || '—')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Account card */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                  Account
                </span>
                <div className="flex-1 h-px bg-brand-100" />
              </div>

              <Field label="Customer Type" value={customerTypeLabel[customer?.customerType ?? ''] ?? null} />
              <Field label="Area Type" value={areaTypeLabel[customer?.areaType ?? ''] ?? null} />
              <Field
                label="Subsidy"
                value={
                  customer?.subsidyEligible === undefined
                    ? null
                    : customer.subsidyEligible
                    ? 'Eligible'
                    : 'Not eligible'
                }
                green={customer?.subsidyEligible === true}
              />
            </div>

            {/* Address card */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                  Address
                </span>
                <div className="flex-1 h-px bg-brand-100" />
              </div>

              <Field label="Street" value={customer?.address} />
              <Field label="City" value={customer?.city} />
              <Field label="State" value={customer?.state} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}