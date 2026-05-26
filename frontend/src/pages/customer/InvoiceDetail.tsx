import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import { ArrowLeft, Flame } from 'lucide-react';
import { getInvoice } from '../../services/invoices';
import { Btn, Spinner } from '../../components/index';
import { money, fmtDateTime, shortId } from '../../utils/helpers';
import type { Invoice } from '../../types';

export default function InvoiceDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [inv, setInv]         = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    getInvoice(orderId)
      .then(res => setInv(res.data))
      .catch(() => showError('Invoice not found'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <Spinner />;
  if (!inv) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Invoice not found</p>
      <Btn variant="ghost" onClick={() => navigate(-1)}>← Back</Btn>
    </div>
  );

  const bookingDate  = inv.order?.createdAt  ? fmtDateTime(inv.order.createdAt)  : '—';
  const deliveryDate = inv.order?.updatedAt  ? fmtDateTime(inv.order.updatedAt)  : '—';

  return (
    <div className="max-w-xl mx-auto">
      {/* Back only — no print/download buttons */}
      <div className="mb-6">
        <Btn variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft size={16} />}>Back</Btn>
      </div>

      {/* Invoice card */}
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

        {/* Bill to */}
        <div className="px-7 py-5 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Bill To</p>
          <p className="font-bold text-gray-900">{inv.customer.name}</p>
          <p className="text-sm text-gray-500">{inv.customer.phone}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {inv.customer.city}, {inv.customer.state}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">
            {inv.customer.customerType.toLowerCase()} · {inv.customer.areaType.toLowerCase()}
          </p>
        </div>

        {/* Order summary */}
        {inv.order && (
          <div className="px-7 py-5 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Order Summary</p>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Cylinder</span>
                <span className="font-medium">
                  {inv.order.cylinderType.replace('KG_', '').replace('_', '.')} kg × {inv.order.quantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Address</span>
                <span className="font-medium text-right max-w-[55%] text-xs">{inv.order.deliveryAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">{inv.order.paymentMethod ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Booking Date</span>
                <span className="font-medium text-xs">{bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Date</span>
                <span className="font-medium text-xs">{deliveryDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* Amount breakdown */}
        <div className="px-7 py-5 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Amount Breakdown</p>
          <div className="text-sm space-y-2.5">
            <div className="flex justify-between text-gray-600">
              <span>Base Price</span>
              <span className="font-medium text-gray-900">{money(inv.cylinderPrice)}</span>
            </div>

            {inv.deliveryCharge > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span className="font-medium text-gray-900">{money(inv.deliveryCharge)}</span>
              </div>
            )}
            {inv.deliveryCharge === 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span className="font-medium text-green-600">FREE</span>
              </div>
            )}

            {inv.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax (21%)</span>
                <span className="font-medium text-gray-900">{money(inv.tax)}</span>
              </div>
            )}

            {inv.subsidy > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Subsidy</span>
                <span className="font-medium text-green-600">− {money(inv.subsidy)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900">
              <span>Final Payable Amount</span>
              <span>{money(inv.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="px-7 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Amount Paid</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">✓ Payment Successful</p>
            </div>
            <p className="text-3xl font-bold text-brand-700">{money(inv.totalAmount)}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-7 py-4 text-center">
          <p className="text-xs text-gray-400">
            Thank you for choosing GasCylinder Booking. This is a computer-generated invoice.
          </p>
        </div>
      </div>
    </div>
  );
}