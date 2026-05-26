import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * REQUEST LOGGER + TRACE ID SYSTEM
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = uuidv4();

  // attach request id to request
  (req as any).requestId = requestId;

  const startTime = Date.now();

  console.log(`➡️ [${requestId}] ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log(
      `⬅️ [${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};