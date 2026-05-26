import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { successResponse } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";

import {
  registerCustomer,
  sendOtpService,
  verifyOtpService,
  adminLoginService,
} from "../services/authService";

import {
  sendPartnerOtp,
  verifyPartnerOtp,
} from "../services/partnerOtpService";

/** REGISTER CUSTOMER */
export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, address, city, state, customerType, areaType, subsidyEligible } = req.body;
  if (!name || !phone || !address || !city || !state) {
    throw new AppError("Missing required fields", 400);
  }
  // customerType/areaType defaulted server-side when not supplied
  const data = await registerCustomer({
    name, phone, address, city, state,
    customerType: customerType ?? "DOMESTIC",
    areaType: areaType ?? "URBAN",
    subsidyEligible: subsidyEligible ?? true,
  });
  return successResponse({ res, code: 201, msg: "Customer registered successfully", data });
});

/** SEND OTP — CUSTOMER */
export const sendOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) throw new AppError("Phone number is required", 400);
  const data = await sendOtpService(phone);
  return successResponse({ res, code: 200, msg: "OTP sent successfully", data });
});

/** VERIFY OTP — CUSTOMER LOGIN */
export const verifyOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new AppError("Phone and OTP are required", 400);
  const data = await verifyOtpService(phone, otp);
  return successResponse({ res, code: 200, msg: "Login successful", data });
});

/** SEND OTP — DELIVERY PARTNER LOGIN (PRD §6) */
export const partnerSendOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) throw new AppError("Phone number is required", 400);
  const data = await sendPartnerOtp(phone);
  return successResponse({ res, code: 200, msg: "OTP sent successfully", data });
});

/** VERIFY OTP — DELIVERY PARTNER LOGIN (PRD §6) */
export const partnerVerifyOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) throw new AppError("Phone and OTP are required", 400);
  const data = await verifyPartnerOtp(phone, otp);
  return successResponse({ res, code: 200, msg: "Partner login successful", data });
});

/** ADMIN LOGIN */
export const adminLoginController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) throw new AppError("Phone number is required", 400);
  const data = await adminLoginService(phone);
  return successResponse({ res, code: 200, msg: "Admin login successful", data });
});

/** GET CURRENT CUSTOMER PROFILE (for Profile page read-only fields) */
export const getMeController = asyncHandler(async (req: Request, res: Response) => {
  const customerId = (req as any).user?.id;
  if (!customerId) throw new AppError("Not authenticated", 401);

  const customer = await (await import("../config/db")).default.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true, name: true, phone: true, address: true, city: true, state: true,
      customerType: true, areaType: true, subsidyEligible: true,
    },
  });
  if (!customer) throw new AppError("Customer not found", 404);

  return successResponse({ res, code: 200, msg: "Profile fetched", data: customer });
});