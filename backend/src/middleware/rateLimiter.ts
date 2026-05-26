/**
 * FILE: backend/src/middleware/rateLimiter.ts
 *
 * Two-layer OTP protection:
 *   Layer 1 (IP-level):    rate limiters here — blocks distributed/botnet abuse
 *   Layer 2 (phone-level): attempt counter + block inside otpService / partnerOtpService
 *
 * otpSendLimiter   — 5 send requests per IP per 10 minutes
 * otpVerifyLimiter — 10 verify attempts per IP per 10 minutes
 * authLimiter      — kept for admin login (unchanged)
 * apiLimiter       — general API guard (unchanged)
 */

import rateLimit from "express-rate-limit";

/** General API limiter — 100 req / 15 min / IP */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    code:  429,
    msg:   "Too many requests. Please try again later.",
    data:  null,
    error: null,
  },
});

/**
 * OTP SEND limiter
 * IP-level: max 5 send requests per 10 minutes.
 * Phone-level 30s cooldown is enforced inside otpService.ts.
 */
export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    code:  429,
    msg:   "Too many OTP requests from this IP. Try again in 10 minutes.",
    data:  null,
    error: null,
  },
});

/**
 * OTP VERIFY limiter
 * IP-level: max 10 verify attempts per 10 minutes.
 * Phone-level max-5-attempts + block is enforced inside otpService.ts.
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    code:  429,
    msg:   "Too many OTP verification attempts. Please try again later.",
    data:  null,
    error: null,
  },
});

/**
 * AUTH limiter — used on admin login route (no OTP, just phone check)
 * 5 attempts per 10 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    code:  429,
    msg:   "Too many login attempts. Try again later.",
    data:  null,
    error: null,
  },
});