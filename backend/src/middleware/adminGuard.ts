import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { AppError } from "../utils/AppError";

export const adminGuard = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Unauthorized", 401));
  }

  if (req.user.role !== "ADMIN") {
    return next(new AppError("Admin access only", 403));
  }

  next();
};