import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { generateToken } from "../utils/jwt";
import { sendTwilioOtp, verifyTwilioOtp } from "./twilioService";
import { toDbPhone, toTwilioPhone } from "../utils/phoneUtil";

const PURPOSE = "PARTNER";
const RESEND_COOLDOWN_MS = 30 * 1000;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/** SEND OTP */
export const sendPartnerOtp = async (phone: string) => {
  const dbPhone = toDbPhone(phone);

  const partner = await prisma.deliveryPartner.findUnique({
    where: { phone: dbPhone }
  });

  if (!partner) throw new AppError("Partner not found", 404);

  const now = new Date();

  const existing = await prisma.otpVerification.findFirst({
    where: {
      phone: dbPhone,
      purpose: PURPOSE,
      verified: false
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new AppError("Wait before retry", 429);
    }
  }

  /** LOCAL MODE */
  if (process.env.OTP_MODE === "LOCAL") {
    const otp = generateOtp();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    if (existing) {
      await prisma.otpVerification.update({
        where: { id: existing.id },
        data: {
          otp,
          expiresAt, 
          lastSentAt: now
        }
      });
    } else {
      await prisma.otpVerification.create({
        data: {
          phone: dbPhone,
          purpose: PURPOSE,
          otp,
          verified: false,
          lastSentAt: now,
          expiresAt 
        }
      });
    }

    console.log(`[LOCAL PARTNER OTP] ${dbPhone}: ${otp}`);
    return { message: "OTP sent (LOCAL)" };
  }

  /** TWILIO MODE */
  await sendTwilioOtp(toTwilioPhone(dbPhone));

  return { message: "OTP sent (TWILIO)" };
};

/** VERIFY OTP */
export const verifyPartnerOtp = async (phone: string, otp: string) => {
  const dbPhone = toDbPhone(phone);

  const partner = await prisma.deliveryPartner.findUnique({
    where: { phone: dbPhone }
  });

  if (!partner) throw new AppError("Partner not found", 404);

  if (process.env.OTP_MODE === "LOCAL") {
    const record = await prisma.otpVerification.findFirst({
      where: {
        phone: dbPhone,
        purpose: PURPOSE,
        verified: false
      },
      orderBy: { createdAt: "desc" }
    });

    if (!record) throw new AppError("No OTP found", 400);

    if (record.expiresAt < new Date()) {
      throw new AppError("OTP expired", 400);
    }

    if (record.otp !== otp) {
      throw new AppError("Invalid OTP", 400);
    }

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        verified: true,
        otp: ""
      }
    });
  } else {
    const result = await verifyTwilioOtp(toTwilioPhone(dbPhone), otp);

    if (result.status !== "approved") {
      throw new AppError("Invalid OTP", 400);
    }
  }

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