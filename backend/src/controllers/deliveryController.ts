import { Request, Response } from "express";
import {
  assignDeliveryPartner,
  startDelivery,
  markPartnerArrived,
  completeDelivery
} from "../services/deliveryService";
import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma from "../config/db";


export const assignPartnerController = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) throw new AppError("Missing required field: orderId", 400);
  const data = await assignDeliveryPartner(orderId);
  return successResponse({ res, code: 200, msg: "Partner assigned successfully", data });
});


export const startDeliveryController = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) throw new AppError("Missing required field: orderId", 400);
  const data = await startDelivery(orderId);
  return successResponse({ res, code: 200, msg: "Delivery started", data });
});


export const completeDeliveryController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError("Missing required field: orderId", 400);
    }

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const beforeFile = files?.beforePhoto?.[0];
    const afterFile = files?.afterPhoto?.[0];
    const signatureFile = files?.signaturePhoto?.[0];

    if (!beforeFile || !afterFile || !signatureFile) {
      throw new AppError("All 3 photos are required", 400);
    }

    const beforePhoto = `/uploads/delivery/${beforeFile.filename}`;
    const afterPhoto = `/uploads/delivery/${afterFile.filename}`;
    const signaturePhoto = `/uploads/delivery/${signatureFile.filename}`;

    const data = await completeDelivery({
      orderId,
      beforePhoto,
      afterPhoto,
      signaturePhoto,
    });

    return successResponse({
      res,
      code: 200,
      msg: "Delivery completed",
      data,
    });
  }
);

export const getAssignedOrdersController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const partnerId = req.user?.id as string;

  if (!partnerId) throw new AppError("Unauthorized", 401);

  const orders = await prisma.order.findMany({
    where: { partnerId },
    include: {
      customer: { select: { name: true, phone: true, address: true, city: true } },
      deliveryTracking: true,
      payment: true
    },
    orderBy: { updatedAt: "desc" }
  });

  return successResponse({
    res,
    code: 200,
    msg: "Assigned orders fetched",
    data: orders
  });
});

export const arrivedController = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError(
        "Missing required field: orderId",
        400
      );
    }

    const data = await markPartnerArrived(
      orderId
    );

    return successResponse({
      res,
      code: 200,
      msg: "Arrival notification sent",
      data,
    });
  }
);