import express from "express";
import {
  assignPartnerController,
  startDeliveryController,
  completeDeliveryController,
  getAssignedOrdersController
} from "../controllers/deliveryController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = express.Router();

/**
 * GET ASSIGNED ORDERS for logged-in delivery partner
 * RBAC: DELIVERY_PARTNER only — partnerId taken from JWT
 */
router.get(
  "/my-orders",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  getAssignedOrdersController
);

/**
 * ASSIGN DELIVERY PARTNER
 * RBAC: ADMIN only — system action
 */
router.post(
  "/assign",
  authMiddleware,
  authorizeRoles("ADMIN"),
  assignPartnerController
);

/**
 * START DELIVERY
 * RBAC: DELIVERY_PARTNER only
 */
router.post(
  "/start",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  startDeliveryController
);

/**
 * COMPLETE DELIVERY
 * RBAC: DELIVERY_PARTNER only
 */
router.post(
  "/complete",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  completeDeliveryController
);

export default router;