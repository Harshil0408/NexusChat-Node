import { sendError } from "@shared/response";
import { Request, Response } from "express";

export const notFound = (req: Request, res: Response) => {
  sendError(res, `Route ${req.originalUrl} not found`, 404, "NOT_FOUND");
};
