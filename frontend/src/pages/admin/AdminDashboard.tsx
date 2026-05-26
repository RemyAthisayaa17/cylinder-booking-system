import { useEffect, useState, useCallback } from 'react';
import { Shield, Plus, Users, RefreshCw, Activity, Package } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { createPartner, getPartners, getAutoAssignmentLog } from '../../services/admin';

type Partner = {
  id: string;
  name: string;
  phone: string;
  serviceZone: string;
  currentStatus?: string;
};

type AssignmentLog = {
  orderId: string;
  customerName: string;
  partnerName: string;
  assignedAt: string;
  status: string;
};

export default function AdminDashboard() {
  const { user } = useAuth();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<AssignmentLog[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', serviceZone: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    try {
      const res = await getPartners();
      setPartners(res.data ?? []);
    } catch (err: any) {
      showError(err?.message || 'Failed to load partners');
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  const loadAssignmentLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await getAutoAssignmentLog();
      setAssignmentLogs(res.data ?? []);
    } catch {
      // silently fail — logs may not be available yet
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
    loadAssignmentLogs();
  }, [loadPartners, loadAssignmentLogs]);

  const handleCreate = async () => {
    if (!form.name || !form.phone || !form.serviceZone) {
      showError('All fields are required');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      showError('Please enter a valid 10-digit phone number');
      return;
    }
    setSubmitting(true);
    try {
      await createPartner(form);
      showSuccess('Partner created successfully');
      setForm({ name: '', phone: '', serviceZone: '' });
      loadPartners();
    } catch (err: any) {
      showError(err?.response?.data?.msg || 'Failed to create partner');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    ON_DELIVERY: 'bg-orange-100 text-orange-700',
    OFF_DUTY: 'bg-gray-100 text-gray-500',
  };

  const orderStatusColor: Record<string, string> = {
    ASSIGNED: 'bg-blue-100 text-blue-700',
    OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
    DELIVERED: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-sub">System control &amp; monitoring</p>
      </div>

      {/* ADMIN INFO */}
      <div className="card max-w-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
            <Shield size={20} className="text-brand-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">Admin Session Active</p>
          </div>
        </div>
      </div>

      {/* AUTO ASSIGNMENT MONITOR */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Auto Assignment Monitor</h2>
          </div>
          <button
            onClick={loadAssignmentLogs}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loadingLogs ? (
          <p className="text-sm text-gray-400">Loading assignment logs...</p>
        ) : assignmentLogs.length === 0 ? (
          <div className="text-center py-6">
            <Package size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No assignments yet</p>
            <p className="text-xs text-gray-300 mt-1">Auto-assignments will appear here once orders are confirmed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Order ID</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Customer</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Partner</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2 pr-3">Assigned At</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assignmentLogs.map(log => (
                  <tr key={log.orderId}>
                    <td className="py-2.5 pr-3 font-mono text-xs text-gray-500">{log.orderId.slice(0, 10)}…</td>
                    <td className="py-2.5 pr-3 text-gray-900 font-medium">{log.customerName}</td>
                    <td className="py-2.5 pr-3 text-gray-700">{log.partnerName}</td>
                    <td className="py-2.5 pr-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.assignedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orderStatusColor[log.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PARTNER */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={18} />
          <h2 className="font-semibold text-gray-900">Create Delivery Partner</h2>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-col gap-1">
            <label className="label">Partner Name</label>
            <input
              className="input"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Phone Number</label>
            <input
              className="input"
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label">Service Zone</label>
            <select
              className="input"
              value={form.serviceZone}
              onChange={e => setForm({ ...form, serviceZone: e.target.value })}
            >
              <option value="">Select zone…</option>
              <option value="URBAN">Urban</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create Partner'}
          </button>
        </div>
      </div>

      {/* PARTNERS LIST */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} />
            <h2 className="font-semibold text-gray-900">Delivery Partners</h2>
            <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
              {partners.length}
            </span>
          </div>
          <button onClick={loadPartners} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loadingPartners ? (
          <p className="text-sm text-gray-400">Loading partners...</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-gray-400">No partners created yet</p>
        ) : (
          <div className="space-y-2">
            {partners.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.phone} · Zone: {p.serviceZone}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[p.currentStatus ?? 'AVAILABLE'] ?? 'bg-gray-100 text-gray-500'}`}>
                  {p.currentStatus ?? 'AVAILABLE'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}