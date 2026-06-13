import { AppError } from "@shared/AppError";
import { Request, Response, NextFunction } from "express";

export const authorize =
  (...roles: ("user" | "admin")[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission", 403, "FORBIDDEN"));
    }

    next();
  };
