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

import { registerSchema } from "../validation/auth.validation";


export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError("Access denied. Please check your credentials.", 400);
  }

  const data = await registerCustomer(parsed.data);

  return successResponse({
    res,
    code: 201,
    msg: "Account created successfully.",
    data,
  });
});


export const sendOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new AppError("Access denied. Please check your credentials.", 400);
  }

  const data = await sendOtpService(phone);

  return successResponse({
    res,
    code: 200,
    msg: "OTP sent successfully.",
    data,
  });
});

export const verifyOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new AppError("Access denied. Please check your credentials.", 400);
  }

  const data = await verifyOtpService(phone, otp);

  return successResponse({
    res,
    code: 200,
    msg: "Login successful.",
    data,
  });
});


export const partnerSendOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new AppError("Access denied. Please check your credentials.", 400);
  }

  const data = await sendPartnerOtp(phone);

  return successResponse({
    res,
    code: 200,
    msg: "OTP sent successfully.",
    data,
  });
});

export const partnerVerifyOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new AppError("Access denied. Please check your credentials.", 400);
  }

  const data = await verifyPartnerOtp(phone, otp);

  return successResponse({
    res,
    code: 200,
    msg: "Login successful.",
    data,
  });
});


export const adminLoginController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new AppError("Access denied. Please check your credentials.", 400);
  }

  const data = await adminLoginService(phone);

  return successResponse({
    res,
    code: 200,
    msg: "Login successful.",
    data,
  });
});


export const getMeController = asyncHandler(async (req: Request, res: Response) => {
  const customerId = (req as any).user?.id;

  if (!customerId) {
    throw new AppError("Access denied. Please login again.", 401);
  }

  const customer = await (await import("../config/db")).default.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      customerType: true,
      areaType: true,
      subsidyEligible: true,
    },
  });

  if (!customer) {
    throw new AppError("Access denied. Please login again.", 404);
  }

  return successResponse({
    res,
    code: 200,
    msg: "Profile fetched successfully.",
    data: customer,
  });
});