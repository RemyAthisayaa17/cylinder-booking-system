import { useState } from 'react';
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

    if (
      !form.name.trim() ||
      !cleanPhone ||
      !form.serviceZone
    ) {
      showError('All fields are required');
      return;
    }

    if (cleanPhone.length !== 10) {
      showError('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);

    try {
      await createPartner({
        ...form,
        phone: cleanPhone,
      });

      showSuccess('Partner created successfully');

      setForm({
        name: '',
        phone: '',
        serviceZone: '',
      });
    } catch (err: any) {
      showError(
        err?.response?.data?.msg ||
          err?.message ||
          'Failed to create partner'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title mb-6">
        Create Delivery Partner
      </h1>

      <div className="max-w-sm flex flex-col gap-4">
        <div>
          <label className="label">Name</label>

          <input
            className="input"
            placeholder="e.g. Ramesh Kumar"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />
        </div>

        <div>
          <label className="label">Phone</label>

          <input
            type="tel"
            inputMode="numeric"
            className="input"
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 10),
              })
            }
          />
        </div>

        <div>
          <label className="label">Service Zone</label>

          <select
            className="input"
            value={form.serviceZone}
            onChange={(e) =>
              setForm({
                ...form,
                serviceZone: e.target.value,
              })
            }
          >
            <option value="">Select zone…</option>
            <option value="URBAN">Urban</option>
            <option value="RURAL">Rural</option>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Creating…' : 'Create Partner'}
        </button>
      </div>
    </div>
  );
}