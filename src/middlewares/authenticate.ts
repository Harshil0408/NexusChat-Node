import { env } from "@config/env";
import { JwtPayload } from "@features/auth/auth.types";
import { UnauthorizedError } from "@shared/AppError";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedError();

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    if (payload.type !== "access") throw new UnauthorizedError();

    req.user = payload;
    next();
  } catch (error) {
    next(new UnauthorizedError());
  }
};
