import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '../../utils/toast';
import { Flame, ArrowRight, RefreshCw, Truck, Shield } from 'lucide-react';
import {
  sendOtp,
  verifyOtp,
  sendPartnerOtp,
  verifyPartnerOtp,
  adminLogin,
} from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { Btn } from '../../components/index';
import type { AuthUser } from '../../types';

type Mode = 'customer' | 'partner' | 'admin';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>('customer');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function switchMode(m: Mode) {
    setMode(m);
    setStep('phone');
    setPhone('');
    setPhoneErr('');
    setOtp(Array(6).fill(''));
    setSeconds(0);
  }

  useEffect(() => {
    if (!seconds) return;

    const t = setTimeout(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [seconds]);

  function validatePhone() {
    setPhoneErr('');

    if (!phone) {
      setPhoneErr('Phone number is required');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneErr('Enter a valid 10-digit mobile number');
      return false;
    }

    return true;
  }

  // ───────────────── ADMIN LOGIN ─────────────────
  async function handleAdminLogin() {
    if (!validatePhone()) return;

    setLoading(true);

    try {
      const res: any = await adminLogin(phone);

      const data = res?.data ?? res;

      const userData = data?.user;

      if (!userData?.id) {
        throw new Error('Invalid admin response');
      }

      const user: AuthUser = {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        role: data.role,
      };

      login(data.token, user);

      showSuccess('Welcome, Admin!');

      navigate('/admin/dashboard');
    } catch (e: any) {
      showError(
        e?.response?.data?.msg ||
          e?.message ||
          'Admin login failed'
      );
    } finally {
      setLoading(false);
    }
  }

  // ───────────────── PARTNER SEND OTP ─────────────────
  async function handlePartnerSendOtp() {
    if (!validatePhone()) return;

    setLoading(true);

    try {
      await sendPartnerOtp(phone);

      showSuccess('OTP sent to your registered mobile number');

      setStep('otp');
      setSeconds(60);

      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (e: any) {
      showError(
        e?.response?.data?.msg ||
          e?.message ||
          'Failed to send OTP'
      );
    } finally {
      setLoading(false);
    }
  }

  // ───────────────── PARTNER VERIFY OTP ─────────────────
  async function handlePartnerVerifyOtp() {
    const code = otp.join('');

    if (code.length < 6) {
      return showError('Enter all 6 digits');
    }

    setLoading(true);

    try {
      const res: any = await verifyPartnerOtp(phone, code);

      const data = res?.data ?? res;

      const partner = data?.partner ?? data?.user;

      if (!partner?.id) {
        throw new Error('Invalid partner response');
      }

      const user: AuthUser = {
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        role: data.role,
      };

      login(data.token, user);

      showSuccess(`Welcome, ${partner.name}!`);

      navigate('/partner/dashboard');
    } catch (e: any) {
      showError(
        e?.response?.data?.msg ||
          e?.message ||
          'Invalid or expired OTP'
      );
    } finally {
      setLoading(false);
    }
  }

  // ───────────────── CUSTOMER SEND OTP ─────────────────
  async function handleSendOtp() {
    if (!validatePhone()) return;

    setLoading(true);

    try {
      await sendOtp(phone);

      showSuccess('OTP sent to your registered mobile number');

      setStep('otp');
      setSeconds(60);

      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch (e: any) {
      showError(
        e?.response?.data?.msg ||
          e?.message ||
          'Failed to send OTP'
      );
    } finally {
      setLoading(false);
    }
  }

  // ───────────────── CUSTOMER VERIFY OTP ─────────────────
  async function handleVerifyOtp() {
    const code = otp.join('');

    if (code.length < 6) {
      return showError('Enter all 6 digits');
    }

    setLoading(true);

    try {
      const res: any = await verifyOtp(phone, code);

      const data = res?.data ?? res;

      const customer = data?.customer ?? data?.user;

      if (!customer?.id) {
        throw new Error('Invalid customer response');
      }

      const user: AuthUser = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        role: data.role,
      };

      login(data.token, user);

      showSuccess(`Welcome, ${customer.name}!`);

      navigate('/dashboard');
    } catch (e: any) {
      showError(
        e?.response?.data?.msg ||
          e?.message ||
          'Invalid or expired OTP'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;

    const next = [...otp];

    next[i] = val.slice(-1);

    setOtp(next);

    if (val && i < 5) {
      refs.current[i + 1]?.focus();
    }
  }

  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();

    const digits = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    const next = [...otp];

    digits.split('').forEach((d, i) => {
      next[i] = d;
    });

    setOtp(next);

    refs.current[Math.min(digits.length, 5)]?.focus();
  }

  const OtpBox = () => (
    <div className="space-y-5">
      <div>
        <label className="label text-center block mb-3">
          6-digit OTP
        </label>

        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 focus:outline-none transition-all ${
                d
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 focus:border-brand-400'
              }`}
            />
          ))}
        </div>
      </div>

      <Btn
        onClick={
          mode === 'partner'
            ? handlePartnerVerifyOtp
            : handleVerifyOtp
        }
        loading={loading}
        className="w-full justify-center"
      >
        Verify &amp; Login
      </Btn>

      <div className="text-center text-sm">
        {seconds > 0 ? (
          <span className="text-gray-400">
            Resend in{' '}
            <span className="text-brand-600 font-semibold">
              {seconds}s
            </span>
          </span>
        ) : (
          <button
            onClick={
              mode === 'partner'
                ? handlePartnerSendOtp
                : handleSendOtp
            }
            className="text-brand-600 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw size={13} />
            Resend OTP
          </button>
        )}
      </div>

      <button
        onClick={() => {
          setStep('phone');
          setOtp(Array(6).fill(''));
        }}
        className="w-full text-sm text-gray-400 hover:text-gray-600 text-center"
      >
        ← Change number
      </button>
    </div>
  );

  const PhoneInput = ({
    onSubmit,
  }: {
    onSubmit: () => void;
  }) => (
    <div className="space-y-4">
      <div>
        <label className="label">Mobile Number</label>

        <div className="flex gap-2 mt-1">
          <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
            +91
          </span>

          <input
            type="tel"
            value={phone}
            onChange={(e) =>
              setPhone(
                e.target.value.replace(/\D/g, '').slice(0, 10)
              )
            }
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            placeholder="Enter your registered number"
            className="input flex-1"
            autoFocus
          />
        </div>

        {phoneErr && (
          <p className="text-red-500 text-xs mt-1">
            {phoneErr}
          </p>
        )}
      </div>

      <Btn
        onClick={onSubmit}
        loading={loading}
        className="w-full justify-center"
        icon={<ArrowRight size={15} />}
      >
        Send OTP
      </Btn>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50/30 flex flex-col">
      <div className="px-6 py-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Flame size={16} className="text-white" />
        </div>

        <span className="font-bold text-gray-900">
          GasCylinder
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'customer'
                ? step === 'phone'
                  ? 'Customer Login'
                  : 'Enter OTP'
                : mode === 'partner'
                ? step === 'phone'
                  ? 'Partner Login'
                  : 'Enter OTP'
                : 'Admin Login'}
            </h1>

            <p className="text-gray-500 text-sm mt-1">
              {(mode === 'customer' || mode === 'partner') &&
              step === 'otp'
                ? `OTP sent to +91 ${phone}`
                : mode === 'partner'
                ? 'Partners login with OTP verification'
                : 'Enter your registered mobile number'}
            </p>
          </div>

          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-5">
            <button
              onClick={() => switchMode('customer')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'customer'
                  ? 'bg-white text-brand-700 shadow-card'
                  : 'text-gray-500'
              }`}
            >
              Customer
            </button>

            <button
              onClick={() => switchMode('partner')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'partner'
                  ? 'bg-white text-brand-700 shadow-card'
                  : 'text-gray-500'
              }`}
            >
              <Truck size={14} />
              Partner
            </button>

            <button
              onClick={() => switchMode('admin')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === 'admin'
                  ? 'bg-white text-brand-700 shadow-card'
                  : 'text-gray-500'
              }`}
            >
              <Shield size={14} />
              Admin
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-7">
            {mode === 'admin' && (
              <div className="space-y-4">
                <div>
                  <label className="label">
                    Admin Phone Number
                  </label>

                  <div className="flex gap-2 mt-1">
                    <span className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                      +91
                    </span>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10)
                        )
                      }
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        handleAdminLogin()
                      }
                      placeholder="Admin credential"
                      className="input flex-1"
                      autoFocus
                    />
                  </div>

                  {phoneErr && (
                    <p className="text-red-500 text-xs mt-1">
                      {phoneErr}
                    </p>
                  )}
                </div>

                <Btn
                  onClick={handleAdminLogin}
                  loading={loading}
                  className="w-full justify-center"
                  icon={<ArrowRight size={15} />}
                >
                  Login as Admin
                </Btn>
              </div>
            )}

            {mode === 'partner' && step === 'phone' && (
              <PhoneInput onSubmit={handlePartnerSendOtp} />
            )}

            {mode === 'partner' && step === 'otp' && (
              <OtpBox />
            )}

            {mode === 'customer' && step === 'phone' && (
              <PhoneInput onSubmit={handleSendOtp} />
            )}

            {mode === 'customer' && step === 'otp' && (
              <OtpBox />
            )}

            {mode === 'customer' && (
              <p className="text-center text-sm text-gray-500 mt-5">
                New here?{' '}
                <Link
                  to="/register"
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Create account
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}