import { Request, Response } from "express";
import {
  processPayment,
  retryPayment
} from "../services/paymentService";
import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

/**
 * PROCESS PAYMENT (UPI / ONLINE)
 */
export const processPaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId, method } = req.body;

    if (!orderId || !method) {
      throw new AppError("Missing required fields: orderId, method", 400);
    }

    const data = await processPayment({
      orderId,
      method
    });

    return successResponse({
      res,
      code: 200,
      msg: "Payment processed successfully",
      data
    });
  }
);

/**
 * CASH PAYMENT CONTROLLER (MISSING FIXED)
 */
export const cashPaymentController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError("Missing required field: orderId", 400);
    }

    const data = await processPayment({
      orderId,
      method: "CASH"
    });

    return successResponse({
      res,
      code: 200,
      msg: "Cash payment selected",
      data
    });
  }
);

/**
 * RETRY PAYMENT CONTROLLER
 */
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
      msg: "Payment retry successful",
      data
    });
  }
);