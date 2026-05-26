import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminGuard } from "../middleware/adminGuard";
import {
  createPartnerController,
  getPartnersController,
  getAutoAssignmentLogController,
} from "../controllers/adminController";

const router = express.Router();

/** PARTNER MANAGEMENT */
router.post("/partners", authMiddleware, adminGuard, createPartnerController);
router.get("/partners", authMiddleware, adminGuard, getPartnersController);

/**
 * AUTO ASSIGNMENT MONITOR
 * PRD §2: Admin-only. Assignment logic NOT exposed to customer UI.
 */
router.get("/assignments", authMiddleware, adminGuard, getAutoAssignmentLogController);

export default router;