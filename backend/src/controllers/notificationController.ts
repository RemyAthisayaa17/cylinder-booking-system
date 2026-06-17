import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  getCustomerNotifications,
  markNotificationAsRead,
} from "../services/notificationService";

import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const getNotificationsController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const customerId = req.user?.id;

    if (!customerId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await getCustomerNotifications(customerId);

    return successResponse({
      res,
      code: 200,
      msg: "Notifications fetched successfully",
      data,
    });
  }
);

export const markNotificationReadController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const notificationId = String(req.params.notificationId);

    if (!notificationId) {
      throw new AppError("Notification ID is required", 400);
    }

    const data = await markNotificationAsRead(
      notificationId
    );

    return successResponse({
      res,
      code: 200,
      msg: "Notification marked as read",
      data,
    });
  }
);