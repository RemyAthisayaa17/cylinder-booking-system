import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { successResponse } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import {
  createPartnerService,
  getPartnersService,
  getAutoAssignmentLogService,
  updatePartnerService,
  deletePartnerService,
} from "../services/adminService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createPartnerController = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, email, serviceZone } = req.body;

  if (!name || !phone || !email || !serviceZone) {
    throw new AppError("Missing required fields", 400);
  }

  if (!EMAIL_REGEX.test(String(email).trim())) {
    throw new AppError("Invalid email format", 400);
  }

  const partner = await createPartnerService({
    name,
    phone,
    email: String(email).trim(),
    serviceZone,
  });

  return successResponse({ res, code: 201, msg: "Partner created successfully", data: partner });
});


export const getPartnersController = asyncHandler(async (req: Request, res: Response) => {
  const partners = await getPartnersService();
  return successResponse({ res, code: 200, msg: "Partners fetched successfully", data: partners });
});


export const updatePartnerController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, phone, email, serviceZone } = req.body;

  if (!name || !phone || !email || !serviceZone) {
    throw new AppError("Missing required fields", 400);
  }

  if (!EMAIL_REGEX.test(String(email).trim())) {
    throw new AppError("Invalid email format", 400);
  }

  const partner = await updatePartnerService(id, {
    name,
    phone,
    email: String(email).trim(),
    serviceZone,
  });

  return successResponse({ res, code: 200, msg: "Partner updated successfully", data: partner });
});


export const deletePartnerController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = await deletePartnerService(id);
  return successResponse({ res, code: 200, msg: "Partner deleted successfully", data: result });
});


export const getAutoAssignmentLogController = asyncHandler(async (req: Request, res: Response) => {
  const logs = await getAutoAssignmentLogService();
  return successResponse({ res, code: 200, msg: "Assignment logs fetched", data: logs });
});