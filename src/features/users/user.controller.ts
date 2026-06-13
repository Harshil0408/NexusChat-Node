import { Request, Response } from "express";
import { UserService } from "./user.service";
import { asyncHandler } from "@shared/asyncHandler";
import { sendSuccess } from "@shared/response";
import { UnauthorizedError } from "@shared/AppError";

export class UserController {
  constructor(private service = new UserService()) {}

  // GET /api/users/me
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.getUser(req.user!.userId);
    sendSuccess(res, user);
  });

  // GET /api/users/:id
  getUser = asyncHandler(async (req: Request, res: Response) => {
    // user can only get their own profile, admin can get anyone
    if (req.user!.role !== "admin" && req.params.id !== req.user!.userId) {
      throw new UnauthorizedError();
    }
    const user = await this.service.getUser(req.params.id as string);
    sendSuccess(res, user);
  });

  // PATCH /api/users/me
  updateMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.updateUser(req.user!.userId, req.body);
    sendSuccess(res, user, 200, undefined, "Profile updated successfully");
  });

  // GET /api/users — admin only
  getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const users = await this.service.getAllUsers();
    sendSuccess(res, users);
  });

  // DELETE /api/users/:id — admin only
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteUser(req.params.id as string);
    sendSuccess(res, null, 200, undefined, "User deleted successfully");
  });
}
