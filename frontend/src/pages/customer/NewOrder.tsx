import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { showSuccess, showError } from '../../utils/toast';
import { Package, MapPin, CreditCard, Info, ArrowRight, Banknote, Smartphone, AlertCircle } from 'lucide-react';
import { createOrder } from '../../services/orders';
import { getEligibility } from '../../services/orders';
import { cashPayment } from '../../services/payments'; // FIX: import cashPayment
import http from '../../api/http';
import { Btn, Card, Spinner } from '../../components/index';
import { saveOrder } from '../../utils/helpers';
import type { CylinderType, PaymentMethod, CustomerType } from '../../types';
import type { EligibilityResult } from '../../services/orders';

const DOMESTIC_CYLINDERS: { type: CylinderType; label: string; desc: string }[] = [
  { type: 'KG_14_2', label: '14.2 kg', desc: 'Domestic household' },
];

const COMMERCIAL_CYLINDERS: { type: CylinderType; label: string; desc: string }[] = [
  { type: 'KG_19',   label: '19 kg',   desc: 'Commercial / restaurant' },
  { type: 'KG_47_5', label: '47.5 kg', desc: 'Industrial / bulk' },
];

export default function NewOrder() {
  const navigate = useNavigate();
  const [loading, setLoading]               = useState(false);
  const [customerType, setCustomerType]     = useState<CustomerType | null>(null);
  const [cylinder, setCylinder]             = useState<CylinderType | null>(null);
  const [qty, setQty]                       = useState(1);
  const [method, setMethod]                 = useState<PaymentMethod>('UPI');
  const [eligibility, setEligibility]       = useState<EligibilityResult | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<{ deliveryAddress: string }>();

  // Load customer profile: determine customerType + prefill address
  useEffect(() => {
    Promise.all([
      http.get('/api/auth/me'),
      getEligibility(),
    ])
      .then(([profileRes, eligRes]) => {
        const c = profileRes.data?.data;
        if (c?.address) {
          const full = [c.address, c.city, c.state].filter(Boolean).join(', ');
          setValue('deliveryAddress', full);
        }
        if (c?.customerType) {
          const ct = c.customerType as CustomerType;
          setCustomerType(ct);
          // Set default cylinder for this customer type
          setCylinder(ct === 'DOMESTIC' ? 'KG_14_2' : 'KG_19');
        }
        setEligibility(eligRes.data);
      })
      .catch(() => {/* non-critical — allow manual selection */})
      .finally(() => setProfileLoading(false));
  }, [setValue]);

  const cylinders = customerType === 'DOMESTIC'
    ? DOMESTIC_CYLINDERS
    : customerType === 'COMMERCIAL'
    ? COMMERCIAL_CYLINDERS
    : [...DOMESTIC_CYLINDERS, ...COMMERCIAL_CYLINDERS]; // fallback while loading

  async function onSubmit({ deliveryAddress }: { deliveryAddress: string }) {
    if (!cylinder) {
      showError('Please select a cylinder type');
      return;
    }
    setLoading(true);
    try {
      const res = await createOrder({
        cylinderType: cylinder,
        quantity: qty,
        deliveryAddress,
        paymentMethod: method,
      });
      const { orderId, status, amount } = res.data;

      saveOrder({
        orderId,
        status,
        amount,
        cylinderType: cylinder,
        quantity: qty,
        deliveryAddress,
        paymentMethod: method,
        paymentStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      
      if (method === 'CASH') {
        await cashPayment(orderId);
        showSuccess('Order placed! Cash on delivery confirmed.');
      } else {
        showSuccess('Order placed!');
      }

      navigate(`/orders/${orderId}`);
    } catch (e: any) {
      showError(e?.message ?? 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  if (profileLoading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Book Gas Cylinder</h1>
        <p className="page-sub">Fill in the details below</p>
      </div>

      {/* Eligibility warning */}
      {eligibility && !eligibility.eligible && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertCircle size={17} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{eligibility.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Cylinder type */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={17} className="text-brand-600" /> Cylinder Type
          </h2>
          <div className="space-y-2.5">
            {cylinders.map(c => (
              <button
                key={c.type}
                type="button"
                onClick={() => setCylinder(c.type)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  cylinder === c.type
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 hover:border-brand-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  cylinder === c.type ? 'border-brand-600' : 'border-gray-300'
                }`}>
                  {cylinder === c.type && <div className="w-2 h-2 rounded-full bg-brand-600" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Quantity */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4">Quantity</h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 font-bold text-lg text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center"
            >
              −
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(q => Math.min(5, q + 1))}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 font-bold text-lg text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center"
            >
              +
            </button>
            <p className="text-xs text-gray-400">Max 5 per order</p>
          </div>
        </Card>

        {/* Address */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={17} className="text-brand-600" /> Delivery Address
          </h2>
          <textarea
            {...register('deliveryAddress', { required: 'Delivery address is required' })}
            placeholder="Enter your full delivery address…"
            rows={3}
            className="input resize-none"
          />
          {errors.deliveryAddress && (
            <p className="text-red-500 text-xs mt-1">{errors.deliveryAddress.message}</p>
          )}
        </Card>

        {/* Payment method */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard size={17} className="text-brand-600" /> Payment Method
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(['UPI', 'CASH'] as PaymentMethod[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  method === m ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-brand-200'
                }`}
              >
                {m === 'UPI'
                  ? <Smartphone size={22} className={method === 'UPI' ? 'text-brand-600' : 'text-gray-400'} />
                  : <Banknote   size={22} className={method === 'CASH' ? 'text-brand-600' : 'text-gray-400'} />
                }
                <p className={`text-sm font-semibold ${method === m ? 'text-brand-700' : 'text-gray-700'}`}>
                  {m === 'UPI' ? 'UPI / Online' : 'Cash on Delivery'}
                </p>
              </button>
            ))}
          </div>
        </Card>

  

        <Btn
          type="submit"
          loading={loading}
          className="w-full justify-center"
          icon={<ArrowRight size={15} />}
          disabled={!eligibility?.eligible}
        >
          Place Order
        </Btn>
      </form>
    </div>
  );
}