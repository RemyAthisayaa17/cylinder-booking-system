import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminGuard } from "../middleware/adminGuard";
import {
  createPartnerController,
  getPartnersController,
  getAutoAssignmentLogController,
  updatePartnerController,
  deletePartnerController,
} from "../controllers/adminController";

const router = express.Router();

router.post("/partners", authMiddleware, adminGuard, createPartnerController);
router.get("/partners", authMiddleware, adminGuard, getPartnersController);
router.patch("/partners/:id", authMiddleware, adminGuard, updatePartnerController);
router.delete("/partners/:id", authMiddleware, adminGuard, deletePartnerController);


router.get("/assignments", authMiddleware, adminGuard, getAutoAssignmentLogController);

export default router;