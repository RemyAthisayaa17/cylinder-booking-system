
import { Router } from "express";
import {
  registerController,
  sendOtpController,
  verifyOtpController,
  partnerSendOtpController,
  partnerVerifyOtpController,
  adminLoginController,
  getMeController,
} from "../controllers/authController";
import {
  otpSendLimiter,
  otpVerifyLimiter,
  authLimiter,
} from "../middleware/rateLimiter";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

/** REGISTER CUSTOMER — no rate limit (registration is one-time) */
router.post("/register", registerController);

/**
 * CUSTOMER OTP LOGIN
 * IP-level rate limit here; phone-level cooldown + attempt block in otpService.ts
 */
router.post("/send-otp",    otpSendLimiter,   sendOtpController);
router.post("/verify-otp",  otpVerifyLimiter,  verifyOtpController);

/**
 * PARTNER OTP LOGIN
 * Same two-layer protection; phone-level logic in partnerOtpService.ts
 */
router.post("/partner-send-otp",   otpSendLimiter,   partnerSendOtpController);
router.post("/partner-verify-otp", otpVerifyLimiter,  partnerVerifyOtpController);

/** ADMIN LOGIN — no OTP, just fixed phone check */
router.post("/admin-login", authLimiter, adminLoginController);

/** GET CURRENT CUSTOMER PROFILE — used by Profile page */
router.get("/me", authMiddleware, getMeController);

export default router;