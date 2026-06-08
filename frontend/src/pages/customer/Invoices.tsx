import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError } from '../../utils/toast';
import { getInvoice } from '../../services/invoices';
import { Spinner } from '../../components/index';
import { money, shortId, fmtDateTime } from '../../utils/helpers';
import type { Invoice } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function Invoices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Invoices are fetched per-order from the order detail view.
    // This page shows a helpful message directing users to their orders.
    setLoading(false);
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8 text-center">
        <p className="text-gray-500 mb-4">
          Invoices are available for delivered orders.
        </p>
        <button
          className="bg-brand-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-brand-700 transition"
          onClick={() => navigate('/orders')}
        >
          View My Orders
        </button>
      </div>
    </div>
  );
}