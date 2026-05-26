import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { getAutoAssignmentLog } from '../../services/admin';

type AssignmentLog = {
  orderId: string;
  customerName: string;
  partnerName: string;
  assignedAt: string;
  status: string;
};

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Auto Assignment Monitoring</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400">No auto-assignments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {['Order ID', 'Customer', 'Partner', 'Assigned At', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.map(log => (
                <tr key={log.orderId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {log.orderId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-900">{log.customerName}</td>
                  <td className="px-4 py-3 text-gray-700">{log.partnerName}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(log.assignedAt).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}