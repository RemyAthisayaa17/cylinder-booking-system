import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    code: 429,
    msg: "Too many actions in a short time. Please slow down.",
    data: null,
    error: null,
  },
skipSuccessfulRequests: false,
});


export const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5, 
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    code: 429,
    msg: "Too many OTP requests. Please wait a few minutes.",
    data: null,
    error: null,
  },
});


export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15, 

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    code: 429,
    msg: "Too many verification attempts. Please try again later.",
    data: null,
    error: null,
  },
});


export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8, 
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    code: 429,
    msg: "Too many login attempts. Please wait and try again.",
    data: null,
    error: null,
  },
});