import { z } from "zod";

/**
 * REGISTER CUSTOMER VALIDATION
 */
export const registerSchema = z.object({
  name: z.string().min(2, "Name too short"),
  phone: z.string().max(10),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),

  customerType: z.enum(["DOMESTIC", "COMMERCIAL"]),
  areaType: z.enum(["URBAN", "RURAL"]),

  subsidyEligible: z.boolean().optional()
});

/**
 * SEND OTP VALIDATION
 */
export const sendOtpSchema = z.object({
  phone: z.string().max(10)
});

/**
 * VERIFY OTP VALIDATION
 */
export const verifyOtpSchema = z.object({
  phone: z.string().max(10),
  otp: z.string().length(6)
});