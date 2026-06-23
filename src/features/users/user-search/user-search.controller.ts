import { Request, Response } from "express";
import { UserSearchService } from "./user-search.service";
import { asyncHandler } from "@shared/asyncHandler";
import { sendSuccess } from "@shared/response";

export class UserSearchController {
  constructor(private service = new UserSearchService()) {}

  search = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const results = await this.service.search(
      query,
      req.user!.userId,
      limit,
      offset,
    );
    sendSuccess(res, results);
  });

  searchByPhone = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.searchByPhone(
      req.query.phone as string,
      req.user!.userId,
    );
    sendSuccess(res, result);
  });

  getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await this.service.getUserProfile(
      req.params.userId as string,
      req.user!.userId,
    );
    sendSuccess(res, profile);
  });
}
