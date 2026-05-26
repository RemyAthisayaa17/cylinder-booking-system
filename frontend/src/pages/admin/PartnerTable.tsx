import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { getPartners } from '../../services/admin';

/**
 * Shape returned by GET /api/admin/partners
 * Source: adminService.getPartnersService → prisma.deliveryPartner.findMany()
 * Prisma schema fields: id, name, phone, serviceZone, currentStatus, totalDeliveries, createdAt
 */
type Partner = {
  id: string;
  name: string;
  phone: string;
  serviceZone: string;
  currentStatus: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';
  totalDeliveries: number;
};

export default function PartnerTable() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPartners();
      setPartners(res.data ?? []);
    } catch (err: any) {
      showError(err?.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Delivery Partner Table</h1>
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
        <p className="text-sm text-gray-400">Loading…</p>
      ) : partners.length === 0 ? (
        <p className="text-sm text-gray-400">No delivery partners found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {['Partner ID', 'Name', 'Phone', 'Status', 'Total Deliveries'].map(h => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                    {p.currentStatus ?? 'AVAILABLE'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {p.totalDeliveries ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}