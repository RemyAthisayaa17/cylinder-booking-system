import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showError } from '../../utils/toast';
import { ArrowLeft, Flame } from 'lucide-react';
import { getInvoice } from '../../services/invoices';
import { Btn, Spinner } from '../../components/index';
import { money, fmtDateTime, shortId } from '../../utils/helpers';
import type { Invoice } from '../../types';

export default function InvoiceDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    (async () => {
      try {
        // getInvoice returns ApiResponse<Invoice> — .data is the Invoice object
        const envelope = await getInvoice(orderId);
        const invoice = envelope?.data ?? null;

        if (!invoice) {
          showError('Invoice not available yet');
          setInv(null);
          return;
        }
        setInv(invoice);
      } catch (err: any) {
        const msg = err?.message ?? 'Invoice not found or not generated yet';
        showError(msg);
        setInv(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <Spinner />;

  if (!inv) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Invoice not found</p>
        <Btn variant="ghost" onClick={() => navigate(-1)}>
          ← Back
        </Btn>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Btn variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={16} />}>
          Back
        </Btn>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-7 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Flame size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold">GasCylinder Booking</p>
                <p className="text-xs text-brand-200">Tax Invoice</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-200">Invoice ID</p>
              <p className="font-mono text-sm font-bold">{shortId(inv.id)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-brand-200 text-xs">Order ID</p>
              <p className="font-semibold font-mono">#{shortId(inv.orderId)}</p>
            </div>
            <div>
              <p className="text-brand-200 text-xs">Invoice Date</p>
              <p className="font-semibold">{fmtDateTime(inv.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        {inv.order && (
          <div className="px-7 pt-5 pb-0 grid grid-cols-2 gap-4 text-sm border-b border-gray-100 pb-5">
            <div>
              <p className="text-xs text-gray-400">Booking Date</p>
              <p className="font-medium">{fmtDateTime(inv.order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Delivery Date</p>
              <p className="font-medium">{fmtDateTime(inv.order.updatedAt)}</p>
            </div>
          </div>
        )}

        {/* Bill To */}
        <div className="px-7 py-5 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Bill To</p>
          <p className="font-bold">{inv.customer.name}</p>
          <p className="text-sm text-gray-500">{inv.customer.phone}</p>
          <p className="text-sm text-gray-500">
            {inv.customer.city}, {inv.customer.state}
          </p>
        </div>

        {/* Line items */}
        <div className="px-7 py-5 space-y-2 text-sm border-b border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">Cylinder Price</span>
            <span>{money(inv.cylinderPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery Charge</span>
            <span>{money(inv.deliveryCharge)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax</span>
            <span>{money(inv.tax)}</span>
          </div>
          {inv.subsidy > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Subsidy</span>
              <span>− {money(inv.subsidy)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="px-7 py-6">
          <div className="flex justify-between font-bold text-lg">
            <span>Total Payable</span>
            <span className="text-brand-700">{money(inv.totalAmount)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}