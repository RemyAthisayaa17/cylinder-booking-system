import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { generateToken } from "../utils/jwt";
import { sendOtpSms } from "./twilioService";

const PURPOSE = "PARTNER";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/** SEND PARTNER OTP */
export const sendPartnerOtp = async (phone: string) => {
  const clean = cleanPhone(phone);

  const partner = await prisma.deliveryPartner.findUnique({
    where: { phone: clean }
  });

  if (!partner) throw new AppError("Partner not found", 404);

  const existing = await prisma.otpVerification.findFirst({
    where: { phone: clean, purpose: PURPOSE, verified: false },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS)
      throw new AppError("Wait before retry", 429);
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
        lastSentAt: now
      }
    });
  }

  console.log(`[PARTNER OTP] ${clean}: ${otp}`);

  if (process.env.OTP_MODE === "TWILIO") {
    await sendOtpSms(clean, otp);
  }

  return { message: "OTP sent", phone: clean };
};

/** VERIFY PARTNER OTP */
export const verifyPartnerOtp = async (phone: string, otp: string) => {
  const clean = cleanPhone(phone);

  const record = await prisma.otpVerification.findFirst({
    where: { phone: clean, purpose: PURPOSE, verified: false },
    orderBy: { createdAt: "desc" }
  });

  if (!record) throw new AppError("No OTP found", 400);

  if (record.blockedUntil && record.blockedUntil > new Date())
    throw new AppError("Too many attempts", 429);

  if (record.expiresAt < new Date())
    throw new AppError("OTP expired", 400);

  if (record.otp !== otp) {
    const count = record.attemptCount + 1;

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        attemptCount: count,
        ...(count >= MAX_ATTEMPTS && {
          blockedUntil: new Date(Date.now() + BLOCK_DURATION_MS)
        })
      }
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

  const partner = await prisma.deliveryPartner.findUnique({
    where: { phone: clean }
  });

  if (!partner) throw new AppError("Partner not found", 404);

  const token = generateToken({
    id: partner.id,
    phone: partner.phone,
    role: "DELIVERY_PARTNER"
  });

  return {
    message: "Login successful",
    token,
    role: "DELIVERY_PARTNER",
    partner
  };
};