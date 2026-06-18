import express from "express";
import {
  generateInvoiceController,
  getInvoiceController
} from "../controllers/invoiceController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";
import { downloadInvoiceController } from "../controllers/invoiceController";
import { emailInvoiceController } from "../controllers/invoiceController";

const router = express.Router();


router.post(
  "/generate",
  authMiddleware,
  authorizeRoles("CUSTOMER", "ADMIN"),
  generateInvoiceController
);

router.get(
  "/:orderId",
  authMiddleware,
  authorizeRoles("CUSTOMER", "DELIVERY_PARTNER", "ADMIN"),
  getInvoiceController
);

router.get(
  "/:orderId/download",
  authMiddleware,
  authorizeRoles("CUSTOMER", "DELIVERY_PARTNER", "ADMIN"),
  downloadInvoiceController
);

router.post(
  "/:orderId/email",
  authMiddleware,
  authorizeRoles("CUSTOMER", "ADMIN"),
  emailInvoiceController
);

export default router;