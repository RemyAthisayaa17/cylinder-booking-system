import { useState } from 'react';
import { Camera, CheckCircle, X } from 'lucide-react';
import { completeDelivery } from '../services/delivery';
import { showSuccess, showError } from '../utils/toast';

type Props = {
  orderId: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

type PhotoField = 'beforePhoto' | 'afterPhoto' | 'signaturePhoto';

const FIELDS: { key: PhotoField; label: string; hint: string }[] = [
  { key: 'beforePhoto',    label: 'Before Cylinder Placement', hint: 'Photo before installing the cylinder' },
  { key: 'afterPhoto',     label: 'After Cylinder Placement',  hint: 'Photo after cylinder is installed'   },
  { key: 'signaturePhoto', label: 'Customer Signature',        hint: 'Photo of customer signature'         },
];

export default function DeliveryProofUpload({ orderId, onSuccess, onClose }: Props) {
  const [photos, setPhotos] = useState<Record<PhotoField, File | null>>({
    beforePhoto:    null,
    afterPhoto:     null,
    signaturePhoto: null,
  });
  const [loading, setLoading] = useState(false);

  const setPhoto = (key: PhotoField, file: File | null) =>
    setPhotos((prev) => ({ ...prev, [key]: file }));

  const allFilled = FIELDS.every(({ key }) => photos[key] !== null);

  const handleSubmit = async () => {
    if (!allFilled) {
      showError('All 3 photos are required');
      return;
    }

    setLoading(true);
    try {
      await completeDelivery(
        orderId,
        photos.beforePhoto!,
        photos.afterPhoto!,
        photos.signaturePhoto!
      );
      showSuccess('Delivery completed successfully!');
      setPhotos({ beforePhoto: null, afterPhoto: null, signaturePhoto: null });
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Failed to complete delivery';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-brand-600" />
          <h2 className="text-xl font-bold text-gray-900">Delivery Proof</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Photo fields */}
      <div className="space-y-4 mb-6">
        {FIELDS.map(({ key, label, hint }) => (
          <UploadBox
            key={key}
            label={label}
            hint={hint}
            file={photos[key]}
            onChange={(f) => setPhoto(key, f)}
          />
        ))}
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1 mb-4">
        {FIELDS.map(({ key }) => (
          <div
            key={key}
            className={`h-1 flex-1 rounded-full transition-colors ${
              photos[key] ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {FIELDS.filter(({ key }) => photos[key]).length} of 3 photos added
      </p>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !allFilled}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? 'Uploading…' : 'Complete Delivery'}
      </button>
    </div>
  );
}

/* ── UploadBox sub-component ─────────────────────────────────── */
function UploadBox({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div
      className={`border-2 rounded-xl p-4 transition-colors ${
        file ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-sm text-gray-800">{label}</p>
        {file && <CheckCircle size={16} className="text-green-500" />}
      </div>
      <p className="text-xs text-gray-400 mb-3">{hint}</p>

      {!file ? (
        <label className="cursor-pointer block">
          <span className="inline-flex items-center gap-2 text-sm text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">
            <Camera size={14} />
            Choose photo
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div>
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="h-36 w-full object-cover rounded-lg mb-2"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X size={12} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}