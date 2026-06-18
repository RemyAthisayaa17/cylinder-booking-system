import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import http from '../../api/http';
import type { Customer as BaseCustomer } from '../../types';

// Local-only extension: `email` already exists on the Customer record in the
// database, but isn't part of the shared Customer type yet. Declared here so
// we don't have to touch types/index.ts or any backend/service file.
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
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span
        className={`text-sm font-medium text-right ${
          value
            ? green
              ? 'text-green-600'
              : 'text-gray-800'
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
      <div className="mb-6">
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your account details</p>
      </div>

      {/* Single unified card */}
      <div className="card p-0 overflow-hidden">

        {/* ── Identity band ── */}
        <div className="flex items-center gap-4 px-6 py-5 bg-gray-50 border-b border-gray-100">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-white leading-none">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900 leading-tight truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">+91 {user?.phone}</p>
          </div>
        </div>

        {/* ── Detail body ── */}
        {loading ? (
          <div className="px-6 py-6">
            <p className="text-sm text-gray-300">Loading…</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 md:divide-x divide-gray-100">

            {/* Account column */}
            <div className="px-6 pt-5 pb-6">
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest mb-3">
                Account
              </p>
              <Field
                label="Email"
                value={customer?.email}
              />
              <Field
                label="Customer Type"
                value={customerTypeLabel[customer?.customerType ?? ''] ?? null}
              />
              <Field
                label="Area Type"
                value={areaTypeLabel[customer?.areaType ?? ''] ?? null}
              />
              <Field
                label="Subsidy Eligible"
                value={
                  customer?.subsidyEligible === undefined
                    ? null
                    : customer.subsidyEligible
                    ? 'Yes'
                    : 'No'
                }
                green={customer?.subsidyEligible === true}
              />
            </div>

            {/* Address column */}
            <div className="px-6 pt-5 pb-6 border-t border-gray-100 md:border-t-0">
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest mb-3">
                Address
              </p>
              <Field label="Street" value={customer?.address} />
              <Field label="City"   value={customer?.city} />
              <Field label="State"  value={customer?.state} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}