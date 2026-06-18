import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Users, UserCheck, Truck, BarChart3, Star, Pencil, Trash2, X, UserPlus } from 'lucide-react';
import { showError, showSuccess } from '../../utils/toast';
import { getPartners, createPartner, updatePartner, deletePartner } from '../../services/admin';
import ConfirmModal from '../../components/ConfirmModal';

type Partner = {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceZone: string;
  currentStatus: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';
  completedDeliveries: number;
  pendingDeliveries: number;
  rating: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


function useLockBodyScroll() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
}

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

function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap px-2.5 py-1 rounded-md bg-gray-900 text-white text-[11px] font-medium shadow-lg z-20 pointer-events-none"
        >
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
          {label}
        </span>
      )}
    </span>
  );
}

function RatingCell({ rating }: { rating: number }) {
  return (
    <Tooltip label={`${'★'.repeat(5)}`}>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 cursor-default">
        <Star size={13} className="text-amber-400 fill-amber-400" />
        {rating.toFixed(1)}
      </span>
    </Tooltip>
  );
}


function AddPartnerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (partner: Partner) => void;
}) {
  useLockBodyScroll();

  const [form, setForm] = useState({ name: '', phone: '', email: '', serviceZone: '' });
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    const cleanPhone = form.phone.replace(/\D/g, '').trim();
    if (!cleanPhone) return 'Phone number is required';
    if (cleanPhone.length !== 10) return 'Phone must be exactly 10 digits';
    const cleanEmail = form.email.trim();
    if (!cleanEmail) return 'Email is required';
    if (!EMAIL_REGEX.test(cleanEmail)) return 'Enter a valid email address';
    if (!form.serviceZone) return 'Area type is required';
    return null;
  };

  const handleCreate = async () => {
    if (submitting) return;

    const err = validate();
    if (err) { showError(err); return; }

    const cleanPhone = form.phone.replace(/\D/g, '').trim();
    const cleanEmail = form.email.trim();
    setSubmitting(true);
    try {
      const res = await createPartner({ name: form.name.trim(), phone: cleanPhone, email: cleanEmail, serviceZone: form.serviceZone });
      showSuccess('Partner created successfully');
      onCreated(res.data);
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { msg?: string } }; message?: string };
      showError(err?.response?.data?.msg || err?.message || 'Failed to create partner');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <UserPlus size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Add Delivery Partner</p>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 flex-shrink-0 font-medium">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
              placeholder="partner@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Area Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all appearance-none cursor-pointer"
              value={form.serviceZone}
              onChange={e => setForm({ ...form, serviceZone: e.target.value })}
            >
              <option value="">Select zone…</option>
              <option value="URBAN">Urban</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create Partner'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Edit Partner Modal ───────────────────────────────────────────────────────
function EditPartnerModal({
  partner,
  onClose,
  onSaved,
}: {
  partner: Partner;
  onClose: () => void;
  onSaved: (updated: Partner) => void;
}) {
  useLockBodyScroll();

  const [form, setForm] = useState({
    name: partner.name,
    phone: partner.phone,
    email: partner.email,
    serviceZone: partner.serviceZone,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (submitting) return;

    const cleanPhone = form.phone.replace(/\D/g, '').trim();
    const cleanEmail = form.email.trim();

    if (!form.name.trim()) { showError('Name is required'); return; }
    if (!cleanPhone) { showError('Phone number is required'); return; }
    if (cleanPhone.length !== 10) { showError('Enter a valid 10-digit mobile number'); return; }
    if (!cleanEmail) { showError('Email is required'); return; }
    if (!EMAIL_REGEX.test(cleanEmail)) { showError('Enter a valid email address'); return; }
    if (!form.serviceZone) { showError('Area type is required'); return; }

    setSubmitting(true);
    try {
      const res = await updatePartner(partner.id, { name: form.name.trim(), phone: cleanPhone, email: cleanEmail, serviceZone: form.serviceZone });
      showSuccess('Partner updated successfully');
      onSaved({ ...partner, ...res.data });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { msg?: string } }; message?: string };
      showError(e?.response?.data?.msg || e?.message || 'Failed to update partner');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Pencil size={15} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Edit Partner</p>
              <p className="text-xs text-gray-400">Update partner details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 flex-shrink-0 font-medium">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Area Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all appearance-none cursor-pointer"
              value={form.serviceZone}
              onChange={e => setForm({ ...form, serviceZone: e.target.value })}
            >
              <option value="">Select zone…</option>
              <option value="URBAN">Urban</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PartnerTable() {
  const [partners, setPartners]       = useState<Partner[]>([]);
  const [loading, setLoading]         = useState(false);
  const [addOpen, setAddOpen]         = useState(false);
  const [editTarget, setEditTarget]   = useState<Partner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [deleting, setDeleting]       = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePartner(deleteTarget.id);
      showSuccess('Partner deleted successfully');
      setPartners(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { msg?: string } }; message?: string };
      showError(e?.response?.data?.msg || e?.message || 'Failed to delete partner');
    } finally {
      setDeleting(false);
    }
  };

  const total     = partners.length;
  const available = partners.filter(p => p.currentStatus === 'AVAILABLE').length;
  const busy      = partners.filter(p => p.currentStatus === 'ON_DELIVERY').length;
  const totalDel  = partners.reduce((acc, p) => acc + (p.completedDeliveries ?? 0), 0);

  const stats = [
    { icon: <Users size={18} className="text-brand-600" />,      iconBg: 'bg-brand-50',   label: 'Total Partners',      value: total     },
    { icon: <UserCheck size={18} className="text-emerald-600" />, iconBg: 'bg-emerald-50', label: 'Available',           value: available },
    { icon: <Truck size={18} className="text-amber-600" />,      iconBg: 'bg-amber-50',   label: 'Busy',                value: busy      },
    { icon: <BarChart3 size={18} className="text-blue-600" />,   iconBg: 'bg-blue-50',    label: 'Completed Deliveries', value: totalDel },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            Delivery Partners
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage delivery partners and monitor delivery capacity.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 bg-brand-600 text-white hover:bg-brand-700 shadow-brand px-4 py-2.5 text-sm flex-shrink-0"
        >
          <UserPlus size={15} />
          Add Partner
        </button>
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading partners…</div>
        ) : partners.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No delivery partners found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Partner</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Contact</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Zone</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Deliveries</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Rating</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 text-xs font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-sm">
                    <p>{p.phone}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.email || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                      {p.serviceZone}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.currentStatus ?? 'AVAILABLE'} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        Completed {p.completedDeliveries ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        Pending {p.pendingDeliveries ?? 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <RatingCell rating={p.rating ?? 5.0} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Tooltip label="Edit">
                        <button
                          onClick={() => setEditTarget(p)}
                          aria-label="Edit partner"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <button
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Delete partner"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && (
        <AddPartnerModal
          onClose={() => setAddOpen(false)}
          onCreated={partner => setPartners(prev => [partner, ...prev])}
        />
      )}

      {editTarget && (
        <EditPartnerModal
          partner={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={updated => {
            setPartners(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Delivery Partner"
          message="Are you sure you want to delete this delivery partner?"
          confirmLabel="Delete"
          confirmingLabel="Deleting…"
          confirming={deleting}
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}