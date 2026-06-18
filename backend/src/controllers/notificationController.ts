import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

import {
  getCustomerNotifications,
  getPartnerNotifications,
  markNotificationAsRead,
} from "../services/notificationService";

import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

export const getNotificationsController = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data =
      role === "DELIVERY_PARTNER"
        ? await getPartnerNotifications(userId)
        : await getCustomerNotifications(userId);

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