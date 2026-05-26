import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { showSuccess, showError } from '../../utils/toast';
import { Flame, ArrowRight } from 'lucide-react';
import { register as registerApi } from '../../services/auth';
import { Btn } from '../../components/index';

interface RegisterFormData {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  customerType: 'DOMESTIC' | 'COMMERCIAL';
  areaType: 'URBAN' | 'RURAL';
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>();

  async function onSubmit(data: RegisterFormData) {
    setLoading(true);
    try {
      await registerApi({
        ...data,
        subsidyEligible: true,
      });
      showSuccess('Account created! Please login.');
      navigate('/login');
    } catch (e: any) {
      showError(e?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50/30 flex flex-col">
      <div className="px-6 py-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Flame size={16} className="text-white" />
        </div>
        <span className="font-bold text-gray-900">GasCylinder</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
            <p className="text-gray-500 text-sm mt-1">Register to book gas cylinders</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div className="flex flex-col gap-1.5">
                <label className="label">Full Name <span className="text-red-500 ml-0.5">*</span></label>
                <input {...register('name', { required: 'Full name is required' })} placeholder="Ravi Kumar" className="input" />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="label">Phone Number <span className="text-red-500 ml-0.5">*</span></label>
                <input
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: { value: /^[6-9]\d{9}$/, message: 'Please enter a valid 10-digit mobile number' },
                  })}
                  placeholder="9000000001" maxLength={10} className="input"
                />
                {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="label">Address <span className="text-red-500 ml-0.5">*</span></label>
                <textarea {...register('address', { required: 'Address is required' })} placeholder="Street, Area" rows={2} className="input resize-none" />
                {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label">City <span className="text-red-500 ml-0.5">*</span></label>
                  <input {...register('city', { required: 'City is required' })} placeholder="Chennai" className="input" />
                  {errors.city && <p className="text-red-500 text-xs">{errors.city.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label">State <span className="text-red-500 ml-0.5">*</span></label>
                  <input {...register('state', { required: 'State is required' })} placeholder="Tamil Nadu" className="input" />
                  {errors.state && <p className="text-red-500 text-xs">{errors.state.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label">Customer Type <span className="text-red-500 ml-0.5">*</span></label>
                  <select {...register('customerType', { required: 'Customer type is required' })} className="input">
                    <option value="">Select…</option>
                    <option value="DOMESTIC">DOMESTIC</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                  </select>
                  {errors.customerType && <p className="text-red-500 text-xs">{errors.customerType.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label">Area Type <span className="text-red-500 ml-0.5">*</span></label>
                  <select {...register('areaType', { required: 'Area type is required' })} className="input">
                    <option value="">Select…</option>
                    <option value="URBAN">URBAN</option>
                    <option value="RURAL">RURAL</option>
                  </select>
                  {errors.areaType && <p className="text-red-500 text-xs">{errors.areaType.message}</p>}
                </div>
              </div>

              <Btn type="submit" loading={loading} className="w-full justify-center" icon={<ArrowRight size={15} />}>
                Create Account
              </Btn>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already registered?{' '}
              <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}