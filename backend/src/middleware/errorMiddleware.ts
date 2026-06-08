import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";


export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    statusCode = 409;
    message = "Duplicate field value detected";
  }

  // Prisma record not found
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  }

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  return res.status(statusCode).json({
    code: statusCode,
    msg: message,
    data: null,
    error: process.env.NODE_ENV === "development" ? err.stack || err.message : null
  });
};
