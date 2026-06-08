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


router.get(
  "/my-orders",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  getMyOrdersController
);


router.get(
  "/eligibility",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  getEligibilityController
);


router.post(
  "/",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  createOrderController
);


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