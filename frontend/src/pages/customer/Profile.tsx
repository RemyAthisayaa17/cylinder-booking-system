import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import http from '../../api/http';
import type { Customer } from '../../types';

export default function Profile() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get(`/api/auth/me`)
      .then(r => setCustomer(r.data?.data ?? null))
      .catch(() => {/* profile fields not critical; fallback to auth context */})
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

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your account details</p>
      </div>

      <div className="card text-center mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
        <p className="text-gray-500 text-sm mt-1">+91 {user?.phone}</p>
      </div>

      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Account Information</h3>
        <dl className="space-y-4 text-sm">
          {[
            { label: 'Full Name', value: user?.name },
            { label: 'Phone', value: `+91 ${user?.phone}` },
            { label: 'Account ID', value: user?.id?.slice(0, 16) + '…' },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
              <dt className="text-gray-500">{row.label}</dt>
              <dd className="font-semibold text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">System Classification</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <dt className="text-gray-500">Customer Type</dt>
              <dd className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {customerTypeLabel[customer?.customerType ?? ''] ?? 'Not assigned'}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Read-only</span>
              </dd>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <dt className="text-gray-500">Area Type</dt>
              <dd className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {areaTypeLabel[customer?.areaType ?? ''] ?? 'Not assigned'}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Read-only</span>
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Subsidy Eligible</dt>
              <dd>
                {customer?.subsidyEligible
                  ? <span className="text-green-600 font-semibold">Yes</span>
                  : <span className="text-gray-400 font-semibold">No</span>
                }
              </dd>
            </div>
          </dl>
        )}
        <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-50">
          Customer type and area are managed by the system administrator. These affect pricing and booking eligibility.
        </p>
      </div>

      {customer?.address && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Address</h3>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-semibold text-gray-900 text-right max-w-[60%]">{customer.address}</dd>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
              <dt className="text-gray-500">City</dt>
              <dd className="font-semibold text-gray-900">{customer.city}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">State</dt>
              <dd className="font-semibold text-gray-900">{customer.state}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}