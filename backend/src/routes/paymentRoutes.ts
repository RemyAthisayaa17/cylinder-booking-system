import express from "express";

import {
  processPaymentController,
  cashPaymentController,
  retryPaymentController,
} from "../controllers/paymentController";

import { authMiddleware } from "../middleware/authMiddleware";

import { authorizeRoles } from "../middleware/roleMiddleware";

const router = express.Router();

/**
 * PROCESS PAYMENT
 */
router.post(
  "/process",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  processPaymentController
);

/**
 * CASH PAYMENT
 */
router.post(
  "/cash",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  cashPaymentController
);

/**
 * RETRY PAYMENT
 */
router.post(
  "/retry",
  authMiddleware,
  authorizeRoles("CUSTOMER"),
  retryPaymentController
);

export default router;