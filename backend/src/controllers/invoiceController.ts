import { Request, Response } from "express";
import { generateInvoice, getInvoice } from "../services/invoiceService";
import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/authMiddleware";

const getSafeStringParam = (value: string | string[] | undefined): string => {
  if (!value) throw new AppError("Missing orderId", 400);
  if (Array.isArray(value)) {
    if (value.length === 0) throw new AppError("Invalid orderId", 400);
    return value[0];
  }
  return value;
};

export const generateInvoiceController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;
    if (!orderId) throw new AppError("Missing required field: orderId", 400);

    const data = await generateInvoice(orderId);

    return successResponse({
      res,
      code: 200,
      msg: "Invoice generated successfully",
      data,
    });
  }
);

export const getInvoiceController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orderId = getSafeStringParam(req.params.orderId);

    const data = await getInvoice(orderId);

    // Ownership check: customers can only fetch their own invoice
    if (req.user?.role === "CUSTOMER" && data.customerId !== req.user.id) {
      throw new AppError("Access denied", 403);
    }

    return successResponse({
      res,
      code: 200,
      msg: "Invoice fetched successfully",
      data,
    });
  }
);