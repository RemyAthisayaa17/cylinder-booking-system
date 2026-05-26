import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * WRAPS ALL ASYNC CONTROLLERS
 * Removes try/catch everywhere — errors flow to global errorMiddleware
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
