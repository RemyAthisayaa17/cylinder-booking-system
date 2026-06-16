import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle2, Clock, Users } from 'lucide-react';
import { getAutoAssignmentLog } from '../../services/admin';

type AssignmentLog = {
  orderId: string;
  customerName: string;
  partnerName: string;
  assignedAt: string;
  status: string;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ASSIGNED:         'bg-blue-100 text-blue-700 border border-blue-200',
    OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-700 border border-amber-200',
    DELIVERED:        'bg-emerald-100 text-emerald-700 border border-emerald-200',
    CONFIRMED:        'bg-brand-100 text-brand-700 border border-brand-200',
    CANCELLED:        'bg-red-100 text-red-700 border border-red-200',
  };
  const label: Record<string, string> = {
    ASSIGNED:         'Assigned',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED:        'Delivered',
    CONFIRMED:        'Confirmed',
    CANCELLED:        'Cancelled',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-500 border border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label[status] ?? status}
    </span>
  );
}

export default function AutoAssignmentMonitor() {
  const [logs, setLogs] = useState<AssignmentLog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAutoAssignmentLog();
      setLogs(res.data ?? []);
    } catch {
      // logs may not exist yet — silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total     = logs.length;
  const active    = logs.filter(l => ['ASSIGNED', 'OUT_FOR_DELIVERY', 'CONFIRMED'].includes(l.status)).length;
  const delivered = logs.filter(l => l.status === 'DELIVERED').length;
  const uniquePartners = new Set(logs.map(l => l.partnerName)).size;

  const stats = [
    { icon: <Activity size={18} className="text-brand-600" />,     iconBg: 'bg-brand-50',   label: 'Total Assignments',  value: total     },
    { icon: <Clock size={18} className="text-amber-600" />,        iconBg: 'bg-amber-50',   label: 'Active Assignments', value: active    },
    { icon: <CheckCircle2 size={18} className="text-emerald-600" />,iconBg: 'bg-emerald-50', label: 'Delivered Orders',   value: delivered },
    { icon: <Users size={18} className="text-blue-600" />,         iconBg: 'bg-blue-50',    label: 'Active Partners',    value: uniquePartners },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          Auto Assignment Monitoring
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track automatically assigned orders and partner activity.
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
          <div className="p-8 text-center text-sm text-gray-400">Loading assignment logs…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <Activity size={22} className="text-brand-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No auto-assignments yet</p>
            <p className="text-xs text-gray-400 mt-1">Auto-assignments will appear here once orders are confirmed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Customer', 'Partner', 'Assigned At', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.orderId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900">{log.customerName}</td>
                    <td className="px-5 py-4 text-gray-600">{log.partnerName}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.assignedAt).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={log.status} />
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