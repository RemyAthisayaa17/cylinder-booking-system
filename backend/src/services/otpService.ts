import prisma from "../config/db";
import { AppError } from "../utils/AppError";
import { generateToken } from "../utils/jwt";
import { sendTwilioOtp, verifyTwilioOtp } from "./twilioService";
import { toDbPhone, toTwilioPhone } from "../utils/phoneUtil";

const PURPOSE = "CUSTOMER";
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


export const sendOtp = async (phone: string) => {
  const dbPhone = toDbPhone(phone);

  const customer = await prisma.customer.findUnique({
    where: { phone: dbPhone }
  });

  if (!customer) throw new AppError("Customer not found", 404);

  const now = new Date();

  const existing = await prisma.otpVerification.findFirst({
    where: { phone: dbPhone, purpose: PURPOSE, verified: false },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new AppError("Wait before retry", 429);
    }
  }


  if (process.env.OTP_MODE === "LOCAL") {
    const otp = generateOtp();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    if (existing) {
      await prisma.otpVerification.update({
        where: { id: existing.id },
        data: { otp, expiresAt, lastSentAt: now }
      });
    } else {
      await prisma.otpVerification.create({
        data: {
          phone: dbPhone,
          purpose: PURPOSE,
          otp,
          expiresAt,
          lastSentAt: now,
          verified: false
        }
      });
    }

    console.log(`[LOCAL OTP] ${dbPhone}: ${otp}`);
    return { message: "OTP sent (LOCAL)" };
  }

  
  await sendTwilioOtp(toTwilioPhone(dbPhone));

  return { message: "OTP sent (TWILIO)" };
};


export const verifyOtp = async (phone: string, otp: string) => {
  const dbPhone = toDbPhone(phone);

  const customer = await prisma.customer.findUnique({
    where: { phone: dbPhone }
  });

  if (!customer) throw new AppError("Customer not found", 404);

  
  if (process.env.OTP_MODE === "LOCAL") {
    const record = await prisma.otpVerification.findFirst({
      where: { phone: dbPhone, purpose: PURPOSE, verified: false },
      orderBy: { createdAt: "desc" }
    });

    if (!record) throw new AppError("No OTP found", 400);
    if (record.expiresAt < new Date()) throw new AppError("OTP expired", 400);
    if (record.otp !== otp) throw new AppError("Invalid OTP", 400);

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true, otp: "" }
    });
  }


  else {
    const result = await verifyTwilioOtp(toTwilioPhone(dbPhone), otp);
    if (result.status !== "approved") {
      throw new AppError("Invalid OTP", 400);
    }
  }

  const token = generateToken({
    id: customer.id,
    phone: customer.phone,
    role: "CUSTOMER"
  });

  return { token, role: "CUSTOMER" };
};