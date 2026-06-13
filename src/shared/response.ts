import { Response } from "express";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, any>,
  description?: string,
) =>
  res.status(statusCode).json({
    success: true,
    data,
    description,
    ...(meta && { meta }),
  });

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
) =>
  res.status(statusCode).json({
    success: false,
    error: { message, code },
  });
