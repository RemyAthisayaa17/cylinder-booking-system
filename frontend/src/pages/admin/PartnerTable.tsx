import { useEffect, useState, useCallback } from 'react';
import { Users, UserCheck, Truck, BarChart3 } from 'lucide-react';
import { showError } from '../../utils/toast';
import { getPartners } from '../../services/admin';

type Partner = {
  id: string;
  name: string;
  phone: string;
  serviceZone: string;
  currentStatus: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';
  totalDeliveries: number;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AVAILABLE:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
    ON_DELIVERY: 'bg-amber-100 text-amber-700 border border-amber-200',
    OFF_DUTY:    'bg-gray-100 text-gray-500 border border-gray-200',
  };
  const label: Record<string, string> = {
    AVAILABLE:   'Available',
    ON_DELIVERY: 'Busy',
    OFF_DUTY:    'Inactive',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-500 border border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'AVAILABLE' ? 'bg-emerald-500' :
        status === 'ON_DELIVERY' ? 'bg-amber-500' : 'bg-gray-400'
      }`} />
      {label[status] ?? status}
    </span>
  );
}

export default function PartnerTable() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPartners();
      setPartners(res.data ?? []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      showError(e?.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total     = partners.length;
  const available = partners.filter(p => p.currentStatus === 'AVAILABLE').length;
  const busy      = partners.filter(p => p.currentStatus === 'ON_DELIVERY').length;
  const totalDel  = partners.reduce((acc, p) => acc + (p.totalDeliveries ?? 0), 0);

  const stats = [
    { icon: <Users size={18} className="text-brand-600" />,     iconBg: 'bg-brand-50',   label: 'Total Partners',    value: total     },
    { icon: <UserCheck size={18} className="text-emerald-600" />, iconBg: 'bg-emerald-50', label: 'Available',         value: available },
    { icon: <Truck size={18} className="text-amber-600" />,     iconBg: 'bg-amber-50',   label: 'Busy',              value: busy      },
    { icon: <BarChart3 size={18} className="text-blue-600" />,  iconBg: 'bg-blue-50',    label: 'Total Deliveries',  value: totalDel  },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          Delivery Partner Table
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage delivery partners and monitor delivery capacity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 hover:shadow-soft transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading partners…</div>
        ) : partners.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No delivery partners found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    Partner
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    Phone
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    Zone
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                    Deliveries
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {partners.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 text-xs font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{p.id.slice(0, 12)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-sm">{p.phone}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        {p.serviceZone}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={p.currentStatus ?? 'AVAILABLE'} />
                    </td>
                    <td className="px-5 py-4 tabular-nums font-semibold text-gray-700">
                      {p.totalDeliveries ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}