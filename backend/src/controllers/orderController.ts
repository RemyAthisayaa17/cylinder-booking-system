import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  createOrder,
  getOrderById,
  getOrdersByCustomer,
  cancelOrder,
  checkCustomerEligibility,
} from "../services/orderService";

import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";


export const createOrderController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const customerId = req.user?.id as string | undefined;

    if (!customerId) {
      throw new AppError("Unauthorized", 401);
    }

    const {
      cylinderType,
      quantity,
      deliveryAddress,
      paymentMethod,
    } = req.body;

    if (
      !cylinderType ||
      !quantity ||
      !deliveryAddress ||
      !paymentMethod
    ) {
      throw new AppError(
        "Missing required fields: cylinderType, quantity, deliveryAddress, paymentMethod",
        400
      );
    }

    const data = await createOrder({
      customerId,
      cylinderType,
      quantity,
      deliveryAddress,
      paymentMethod,
    });

    return successResponse({
      res,
      code: 201,
      msg: "Order created successfully",
      data,
    });
  }
);


export const getOrderByIdController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orderId = String(req.params.orderId);

    if (!orderId) {
      throw new AppError("Order ID is required", 400);
    }

    const data = await getOrderById(orderId);

    // CUSTOMER ownership check
    if (
      req.user?.role === "CUSTOMER" &&
      data.customerId !== req.user.id
    ) {
      throw new AppError("Access denied", 403);
    }

    return successResponse({
      res,
      code: 200,
      msg: "Order fetched successfully",
      data,
    });
  }
);


export const getMyOrdersController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const customerId = req.user?.id as string | undefined;

    if (!customerId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await getOrdersByCustomer(customerId);

    return successResponse({
      res,
      code: 200,
      msg: "Orders fetched successfully",
      data,
    });
  }
);


export const getEligibilityController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const customerId = req.user?.id as string | undefined;

    if (!customerId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await checkCustomerEligibility(customerId);

    return successResponse({
      res,
      code: 200,
      msg: data.message,
      data,
    });
  }
);


export const cancelOrderController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const customerId = req.user?.id;

    if (!customerId) {
      throw new AppError("Unauthorized", 401);
    }

    const orderId = String(req.params.orderId);

    const data = await cancelOrder(orderId, customerId);

    return successResponse({
      res,
      code: 200,
      msg: "Order cancelled successfully",
      data,
    });
  }
);