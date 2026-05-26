import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { sendOtpSms } from "./twilioService";
import { generateToken } from "../utils/jwt";

const PURPOSE = "CUSTOMER";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * SEND CUSTOMER OTP
 */
export const sendOtp = async (phone: string) => {
  const clean = cleanPhone(phone);

  if (!clean || clean.length !== 10) {
    throw new AppError("Invalid phone number", 400);
  }

  const customer = await prisma.customer.findUnique({
    where: { phone: clean }
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const existing = await prisma.otpVerification.findFirst({
    where: {
      phone: clean,
      purpose: PURPOSE,
      verified: false
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const elapsed = Date.now() - new Date(existing.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new AppError(`Wait ${wait}s before retry`, 429);
    }
  }

  const otp = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  if (existing) {
    await prisma.otpVerification.update({
      where: { id: existing.id },
      data: {
        otp,
        expiresAt,
        attemptCount: 0,
        blockedUntil: null,
        lastSentAt: now
      }
    });
  } else {
    await prisma.otpVerification.create({
      data: {
        phone: clean,
        purpose: PURPOSE,
        otp,
        expiresAt,
        verified: false,
        attemptCount: 0,
        lastSentAt: now
      }
    });
  }

  console.log(`[CUSTOMER OTP] ${clean}: ${otp}`);

  if (process.env.OTP_MODE === "TWILIO") {
    await sendOtpSms(clean, otp);
  }

  return {
    message: "OTP sent successfully",
    phone: clean
  };
};

/**
 * VERIFY CUSTOMER OTP
 */
export const verifyOtp = async (phone: string, otp: string) => {
  const clean = cleanPhone(phone);

  if (!clean || clean.length !== 10) {
    throw new AppError("Invalid phone number", 400);
  }

  const record = await prisma.otpVerification.findFirst({
    where: {
      phone: clean,
      purpose: PURPOSE,
      verified: false
    },
    orderBy: { createdAt: "desc" }
  });

  if (!record) {
    console.log("❌ NO OTP RECORD FOUND", { clean });
    throw new AppError("No OTP found", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("OTP expired", 400);
  }

  if (record.otp !== otp) {
    console.log("❌ OTP MISMATCH", {
      expected: record.otp,
      received: otp
    });
    throw new AppError("Invalid OTP", 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: {
      verified: true,
      otp: ""
    }
  });

  const customer = await prisma.customer.findUnique({
    where: { phone: clean }
  });

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const token = generateToken({
    id: customer.id,
    phone: customer.phone,
    role: "CUSTOMER"
  });

  return {
    message: "Login successful",
    token,
    role: "CUSTOMER",
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone
    }
  };
};