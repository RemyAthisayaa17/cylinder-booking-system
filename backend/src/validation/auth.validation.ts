import { z } from "zod";

const phone = z
  .string()
  .regex(/^[0-9]{10}$/, "Invalid phone number");


export const registerSchema = z.object({
  name: z.string().min(2, "Name too short"),

  phone,
  email: z.string().email("Invalid email"),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),

  customerType: z.enum(["DOMESTIC", "COMMERCIAL"]),
  areaType: z.enum(["URBAN", "RURAL"]),

  subsidyEligible: z.boolean().optional(),
});


export const sendOtpSchema = z.object({
  phone,
});

export const verifyOtpSchema = z.object({
  phone,
  otp: z.string().length(6),
});