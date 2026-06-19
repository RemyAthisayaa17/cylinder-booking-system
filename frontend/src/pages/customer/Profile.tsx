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
    <div className="grid grid-cols-2 gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide self-center">
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
    <div className="flex items-start justify-center min-h-[calc(100vh-80px)] py-4 px-4">
      <div className="w-full" style={{ maxWidth: '650px' }}>

        {/* Page header — tight */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Profile</h1>
          <p className="text-xs text-gray-400 mt-0.5">Your account details and address</p>
        </div>

        {/* Unified card */}
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,.07), 0 4px 20px rgba(0,0,0,.06)', border: '1px solid #f0eeff' }}
        >

          {/* ── Identity band ── */}
          <div
            className="flex items-center gap-4 px-6 py-4"
            style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', borderBottom: '1px solid #ede9fe' }}
          >
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #9333ea 0%, #6b21a8 100%)', boxShadow: '0 4px 12px -2px rgba(147,51,234,.4)' }}
            >
              <span className="text-base font-bold text-white leading-none">{initials}</span>
            </div>

            {/* Name + phone */}
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-gray-900 leading-tight truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">+91 {user?.phone}</p>
            </div>

            
          </div>

          {/* ── Detail body ── */}
          {loading ? (
            <div className="px-6 py-5">
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2">

              {/* Account column */}
              <div className="px-6 py-4" style={{ borderRight: '1px solid #f3f4f6' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#9333ea' }}
                  >
                    Account
                  </span>
                  <div className="flex-1 h-px bg-purple-100" />
                </div>
               
                <Field label="Customer Type" value={customerTypeLabel[customer?.customerType ?? ''] ?? null} />
                <Field label="Area Type"     value={areaTypeLabel[customer?.areaType ?? ''] ?? null} />
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

              {/* Address column */}
              <div className="px-6 py-4 border-t border-gray-100 md:border-t-0">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#9333ea' }}
                  >
                    Address
                  </span>
                  <div className="flex-1 h-px bg-purple-100" />
                </div>
                <Field label="Street" value={customer?.address} />
                <Field label="City"   value={customer?.city} />
                <Field label="State"  value={customer?.state} />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}