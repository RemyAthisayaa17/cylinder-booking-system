import { Router } from "express";
import {
  createOrderController,
  getOrderByIdController,
  getMyOrdersController,
  cancelOrderController,
  getEligibilityController,
} from "../controllers/orderController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = Router();

/**
 * GET MY ORDERS (PROTECTED — CUSTOMER only)
 * Must be above /:orderId to avoid route conflict.
 */
router.get(
  "/my-orders",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  getMyOrdersController
);

/**
 * GET ELIGIBILITY (PROTECTED — CUSTOMER only)
 */
router.get(
  "/eligibility",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  getEligibilityController
);

/**
 * CREATE ORDER (PROTECTED — CUSTOMER only)
 */
router.post(
  "/",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  createOrderController
);

/**
 * GET ORDER BY ID (PROTECTED)
 * CUSTOMER: ownership enforced in controller.
 * DELIVERY_PARTNER and ADMIN: unrestricted.
 */
/**
 * CANCEL ORDER
 */
router.patch(
  "/:orderId/cancel",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  cancelOrderController
);

router.get(
  "/:orderId",
  authMiddleware,
  authorizeRoles("CUSTOMER", "DELIVERY_PARTNER", "ADMIN"),
  getOrderByIdController
);

export default router;