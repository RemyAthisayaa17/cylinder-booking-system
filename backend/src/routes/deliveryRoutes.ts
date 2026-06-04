import express from "express";
import {
  assignPartnerController,
  startDeliveryController,
  completeDeliveryController,
  getAssignedOrdersController
} from "../controllers/deliveryController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";
import { uploadDeliveryProof } from "../middleware/uploadMiddleware";

const router = express.Router();

router.get(
  "/my-orders",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  getAssignedOrdersController
);


router.post(
  "/assign",
  authMiddleware,
  authorizeRoles("ADMIN"),
  assignPartnerController
);

router.post(
  "/start",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  startDeliveryController
);

router.post(
  "/complete",
  authMiddleware,
  authorizeRoles("DELIVERY_PARTNER"),
  uploadDeliveryProof.fields([
    { name: "beforePhoto", maxCount: 1 },
    { name: "afterPhoto", maxCount: 1 },
    { name: "signaturePhoto", maxCount: 1 },
  ]),
  completeDeliveryController
);

export default router;