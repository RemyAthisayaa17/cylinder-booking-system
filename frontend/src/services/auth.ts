import http from '../api/http';
import type {
  ApiResponse,
  RegisterPayload, RegisterData,
  SendOtpData,
  VerifyOtpData,
  PartnerLoginData,
  AdminLoginData,
} from '../types';

// POST /api/auth/register
export const register = (payload: RegisterPayload) =>
  http.post<ApiResponse<RegisterData>>('/api/auth/register', payload).then(r => r.data);

// POST /api/auth/send-otp (customer)
export const sendOtp = (phone: string) =>
  http.post<ApiResponse<SendOtpData>>('/api/auth/send-otp', { phone }).then(r => r.data);

// POST /api/auth/verify-otp (customer)
export const verifyOtp = (phone: string, otp: string) =>
  http.post<ApiResponse<VerifyOtpData>>('/api/auth/verify-otp', { phone, otp }).then(r => r.data);

// POST /api/auth/partner-send-otp (partner OTP — PRD §6)
export const sendPartnerOtp = (phone: string) =>
  http.post<ApiResponse<SendOtpData>>('/api/auth/partner-send-otp', { phone }).then(r => r.data);

// POST /api/auth/partner-verify-otp (partner OTP — PRD §6)
export const verifyPartnerOtp = (phone: string, otp: string) =>
  http.post<ApiResponse<PartnerLoginData>>('/api/auth/partner-verify-otp', { phone, otp }).then(r => r.data);

// POST /api/auth/admin-login
export const adminLogin = (phone: string) =>
  http.post<ApiResponse<AdminLoginData>>('/api/auth/admin-login', { phone }).then(r => r.data);