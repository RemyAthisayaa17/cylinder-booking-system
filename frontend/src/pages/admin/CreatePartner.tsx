import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import { createPartner } from '../../services/admin';

type Form = {
  name: string;
  phone: string;
  serviceZone: string;
};

export default function CreatePartner() {
  const [form, setForm] = useState<Form>({
    name: '',
    phone: '',
    serviceZone: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const cleanPhone = form.phone.replace(/\D/g, '').trim();

    if (!form.name.trim() || !cleanPhone || !form.serviceZone) {
      showError('All fields are required');
      return;
    }

    if (cleanPhone.length !== 10) {
      showError('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);

    try {
      await createPartner({ ...form, phone: cleanPhone });
      showSuccess('Partner created successfully');
      setForm({ name: '', phone: '', serviceZone: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { msg?: string } }; message?: string };
      showError(e?.response?.data?.msg || e?.message || 'Failed to create partner');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          Create Delivery Partner
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Register new delivery partners for automatic assignment.
        </p>
      </div>

      {/* Form Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-card p-9">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <UserPlus size={20} className="text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Partner Information</p>
            <p className="text-sm text-gray-400">Fill in the details below to register a new partner</p>
          </div>
        </div>

        <div className="space-y-7">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 flex-shrink-0 font-medium">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                className="flex-1 px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={e =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Zone <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all appearance-none cursor-pointer"
              value={form.serviceZone}
              onChange={e => setForm({ ...form, serviceZone: e.target.value })}
            >
              <option value="">Select zone…</option>
              <option value="URBAN">Urban</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-brand-600 text-white hover:bg-brand-700 shadow-brand px-5 py-3.5 text-sm"
            >
              {submitting ? 'Creating…' : 'Create Partner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}