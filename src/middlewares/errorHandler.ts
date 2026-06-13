import { AppError } from "@shared/AppError";
import { logger } from "@shared/logger";
import { sendError } from "@shared/response";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError && err.isOperational) {
    logger.warn({ err, path: req.path }, "Operational error");
    return sendError(res, err.message, err.statusCode, err.code);
  }

  logger.error({ err, path: req.path }, "Unexpected error");
  return sendError(res, "Something went wrong", 500);
};
