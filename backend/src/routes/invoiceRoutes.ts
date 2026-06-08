import express from "express";
import {
  generateInvoiceController,
  getInvoiceController
} from "../controllers/invoiceController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

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

export default router;