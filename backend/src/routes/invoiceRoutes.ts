import express from "express";
import {
  generateInvoiceController,
  getInvoiceController
} from "../controllers/invoiceController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = express.Router();

/**
 * GENERATE INVOICE (PROTECTED)
 * RBAC: CUSTOMER and ADMIN
 */
router.post(
  "/generate",
  authMiddleware,
  authorizeRoles("CUSTOMER", "ADMIN"),
  generateInvoiceController
);

/**
 * GET INVOICE BY ORDER ID (PROTECTED)
 * RBAC: CUSTOMER, DELIVERY_PARTNER, ADMIN
 */
router.get(
  "/:orderId",
  authMiddleware,
  authorizeRoles("CUSTOMER", "DELIVERY_PARTNER", "ADMIN"),
  getInvoiceController
);

export default router;