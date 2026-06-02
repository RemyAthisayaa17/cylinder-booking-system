
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


router.post("/register", registerController);

router.post("/send-otp",    otpSendLimiter,   sendOtpController);
router.post("/verify-otp",  otpVerifyLimiter,  verifyOtpController);


router.post("/partner-send-otp",   otpSendLimiter,   partnerSendOtpController);
router.post("/partner-verify-otp", otpVerifyLimiter,  partnerVerifyOtpController);


router.post("/admin-login", authLimiter, adminLoginController);


router.get("/me", authMiddleware, getMeController);

export default router;