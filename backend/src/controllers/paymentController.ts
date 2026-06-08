import { Request, Response } from "express";
import {
  processPayment,
  retryPayment,
  collectCashPayment,
} from "../services/paymentService";
import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/authMiddleware";

export const processPaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId, method } = req.body;
    if (!orderId || !method) {
      throw new AppError("Missing required fields: orderId, method", 400);
    }
    const data = await processPayment({ orderId, method });
    return successResponse({
      res,
      code: 200,
      msg: "Payment processed successfully",
      data,
    });
  }
);

export const cashPaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;
    if (!orderId) {
      throw new AppError("Missing required field: orderId", 400);
    }
    const data = await processPayment({ orderId, method: "CASH" });
    return successResponse({
      res,
      code: 200,
      msg: "Cash on delivery selected",
      data,
    });
  }
);

export const retryPaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;
    if (!orderId) {
      throw new AppError("Missing required field: orderId", 400);
    }
    const data = await retryPayment(orderId);
    return successResponse({
      res,
      code: 200,
    msg:
  "convertedToCash" in data && data.convertedToCash
    ? "Maximum retry limit reached. Please pay cash during delivery."
    : "Payment retry successful",
      data,
    });
  }
);


export const collectCashPaymentController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orderId = req.body.orderId;
    const partnerId = req.user?.id as string;

    if (!orderId) {
      throw new AppError("Missing orderId in request body", 400);
    }

    if (!partnerId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await collectCashPayment(orderId, partnerId);

    return successResponse({
      res,
      code: 200,
      msg: "Cash collected successfully",
      data,
    });
  }
);