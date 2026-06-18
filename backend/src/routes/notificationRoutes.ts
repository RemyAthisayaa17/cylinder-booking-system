import { Router } from "express";

import {
  getNotificationsController,
  markNotificationReadController,
} from "../controllers/notificationController";

import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = Router();

router.get(
  "/",
  authMiddleware,
  authorizeRoles("CUSTOMER", "DELIVERY_PARTNER"),
  getNotificationsController
);

router.patch(
  "/:notificationId/read",
  authMiddleware,
  authorizeRoles("CUSTOMER", "DELIVERY_PARTNER"),
  markNotificationReadController
);

export default router;