import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

function useLockBodyScroll() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
}

type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  /** Visual tone of the confirm button + icon. Defaults to 'danger' to preserve existing delete-modal styling. */
  variant?: 'danger' | 'default';
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmingLabel,
  cancelLabel = 'Cancel',
  confirming = false,
  variant = 'danger',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  useLockBodyScroll();

  const isDanger = variant === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-5 flex flex-col items-center text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isDanger ? 'bg-red-50' : 'bg-brand-50'
            }`}
          >
            <AlertTriangle size={20} className={isDanger ? 'text-red-500' : 'text-brand-600'} />
          </div>
          <p className="font-bold text-gray-900 text-sm mb-1.5">{title}</p>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700 shadow-brand'
            }`}
          >
            {confirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}