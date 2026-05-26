import { useEffect, useState } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Btn } from './index';

type Props = {
  open: boolean;
  amount: number;
  orderId: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onRetry: () => Promise<void>;
};

type Status = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRY_LIMIT';

const MAX_RETRIES = 3;

export default function PaymentModal({
  open,
  amount,
  orderId,
  onClose,
  onSuccess,
  onRetry,
}: Props) {
  const [status, setStatus] = useState<Status>('IDLE');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!open) {
      setStatus('IDLE');
      setRetryCount(0);
    }
  }, [open]);

  if (!open) return null;

  // Initial payment attempt — backend decides success/failure (~85% success)
  const handlePayment = async () => {
    try {
      setStatus('PROCESSING');

      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 2500));

      await onSuccess();

      setStatus('SUCCESS');

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setStatus('FAILED');
    }
  };

  // Retry — backend decides success/failure, enforces max 3 retries
  const handleRetry = async () => {
    const nextRetryCount = retryCount + 1;

    if (nextRetryCount > MAX_RETRIES) {
      setStatus('RETRY_LIMIT');
      return;
    }

    try {
      setRetryCount(nextRetryCount);
      setStatus('PROCESSING');

      await new Promise(resolve => setTimeout(resolve, 2000));

      await onRetry();

      setStatus('SUCCESS');

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      // If backend says retry limit reached, show limit screen
      if (e?.status === 409 || nextRetryCount >= MAX_RETRIES) {
        setStatus('RETRY_LIMIT');
      } else {
        setStatus('FAILED');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              UPI Payment
            </h2>

            <p className="text-xs text-gray-500">
              Secure payment gateway
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Merchant Card */}
          <div className="bg-brand-50 rounded-2xl p-4 mb-5 border border-brand-100">

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                Merchant
              </p>

              <p className="font-semibold text-gray-800">
                LPG Cylinder Services
              </p>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                UPI ID
              </p>

              <p className="font-medium text-gray-800">
                gas@upi
              </p>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                Order ID
              </p>

              <p className="font-mono text-xs text-gray-700">
                {orderId.slice(0, 10)}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-brand-100">
              <p className="text-sm text-gray-500">
                Amount
              </p>

              <p className="text-2xl font-bold text-brand-700">
                ₹{amount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Idle */}
          {status === 'IDLE' && (
            <Btn
              className="w-full"
              onClick={handlePayment}
            >
              Pay Now
            </Btn>
          )}

          {/* Processing */}
          {status === 'PROCESSING' && (
            <div className="flex flex-col items-center py-6">
              <Loader2
                size={42}
                className="animate-spin text-brand-600 mb-4"
              />

              <p className="font-semibold text-gray-800">
                Processing Payment...
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Please wait. Do not refresh.
              </p>
            </div>
          )}

          {/* Success */}
          {status === 'SUCCESS' && (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2
                size={52}
                className="text-green-600 mb-4"
              />

              <p className="font-bold text-green-700 text-lg">
                Payment Successful
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Order confirmed successfully
              </p>
            </div>
          )}

          {/* Failed — retry allowed */}
          {status === 'FAILED' && (
            <div className="flex flex-col items-center py-4">

              <AlertCircle
                size={52}
                className="text-red-500 mb-4"
              />

              <p className="font-bold text-red-600 text-lg">
                Payment Failed
              </p>

              <p className="text-sm text-gray-500 mt-1 mb-5 text-center">
                Transaction could not be completed.
              </p>

              <Btn
                className="w-full"
                onClick={handleRetry}
              >
                Retry Payment ({MAX_RETRIES - retryCount} attempt{MAX_RETRIES - retryCount !== 1 ? 's' : ''} left)
              </Btn>
            </div>
          )}

          {/* Retry limit reached */}
          {status === 'RETRY_LIMIT' && (
            <div className="flex flex-col items-center py-4">

              <AlertCircle
                size={52}
                className="text-red-500 mb-4"
              />

              <p className="font-bold text-red-600 text-lg">
                Payment Failed
              </p>

              <p className="text-sm text-red-500 font-medium mt-2 text-center">
                Retry limit reached. Please try again later or use Cash on Delivery.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}