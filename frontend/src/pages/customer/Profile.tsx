import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import http from '../../api/http';
import type { Customer } from '../../types';

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your account details</p>
      </div>

      {/* Profile Summary */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 break-words">
              {user?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              +91 {user?.phone}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Customer Information */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Customer Information
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-gray-500">Customer Type</span>
                <span className="font-semibold text-gray-900">
                  {customerTypeLabel[customer?.customerType ?? ''] ?? 'Not Assigned'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-gray-500">Area Type</span>
                <span className="font-semibold text-gray-900">
                  {areaTypeLabel[customer?.areaType ?? ''] ?? 'Not Assigned'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Subsidy Eligible</span>
                <span
                  className={`font-semibold ${
                    customer?.subsidyEligible
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {customer?.subsidyEligible ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Address Information
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-start pb-3 border-b border-gray-50">
                <span className="text-gray-500">Address</span>
                <span className="font-semibold text-gray-900 text-right max-w-[65%] break-words">
                  {customer?.address || '-'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-gray-500">City</span>
                <span className="font-semibold text-gray-900">
                  {customer?.city || '-'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">State</span>
                <span className="font-semibold text-gray-900">
                  {customer?.state || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}