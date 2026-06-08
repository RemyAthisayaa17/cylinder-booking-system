import { z } from "zod";

/**
 * STRICT PHONE RULE (CRITICAL FIX)
 */
const phone = z
  .string()
  .regex(/^[0-9]{10}$/, "Invalid phone number");

/**
 * REGISTER CUSTOMER VALIDATION
 */
export const registerSchema = z.object({
  name: z.string().min(2, "Name too short"),

  phone,

  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),

  customerType: z.enum(["DOMESTIC", "COMMERCIAL"]),
  areaType: z.enum(["URBAN", "RURAL"]),

  subsidyEligible: z.boolean().optional(),
});

/**
 * OTP VALIDATION
 */
export const sendOtpSchema = z.object({
  phone,
});

export const verifyOtpSchema = z.object({
  phone,
  otp: z.string().length(6),
});