import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "./authMiddleware";

/**
 * ROLE BASED ACCESS CONTROL
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return next(new AppError("Access denied", 403));
    }

    next();
  };
};