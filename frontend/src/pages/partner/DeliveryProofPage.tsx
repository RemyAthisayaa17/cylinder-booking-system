import { useNavigate, useParams } from 'react-router-dom';
import DeliveryProofUpload from '../../components/DeliveryProofUpload';

export default function DeliveryProofPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  if (!orderId) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-red-600">
          Invalid Order
        </h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/partner/orders')}
          className="text-sm text-brand-600 hover:underline"
        >
          ← Back to Orders
        </button>
      </div>

      <div className="card">
        <DeliveryProofUpload
          orderId={orderId}
          onSuccess={() => {
            navigate('/partner/orders');
          }}
        />
      </div>
    </div>
  );
}