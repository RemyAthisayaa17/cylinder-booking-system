import express from "express";
import {
  processPaymentController,
  cashPaymentController,
  retryPaymentController,
  collectCashPaymentController,
} from "../controllers/paymentController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = express.Router();

router.post(
  "/process",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  processPaymentController
);

router.post(
  "/cash",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  cashPaymentController
);

router.post(
  "/retry",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  retryPaymentController
);

router.post(
  "/collect-cash",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  collectCashPaymentController
);

export default router;