import { asyncHandler } from "@shared/asyncHandler";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { sendSuccess } from "@shared/response";

export class AuthController {
  constructor(private service = new AuthService()) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.register(req.body);
    sendSuccess(res, user, 201, {}, "Registered Successfully!");
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const meta = {
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    };

    const result = await this.service.login(req.body, meta);

    if ("two_factor_required" in result) {
      sendSuccess(res, result, 200, {}, "2FA required!");
      return;
    }

    res.cookie("refresh_token", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("access_token", result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(
      res,
      {
        user: result.user,
        access_token: result.tokens.accessToken,
      },
      200,
      {},
      "Logged in Successfully!",
    );
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token ?? req.body?.refresh_token;
    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: "No refresh token", code: "UNAUTHORIZED" },
      });
      return;
    }

    const meta = { ip_address: req.ip, user_agent: req.headers["user-agent"] };
    const tokens = await this.service.refreshTokens(token, meta);

    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { access_token: tokens.accessToken });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token ?? req.body?.refresh_token;
    if (token) await this.service.logout(token);
    res.clearCookie("refresh_token");
    sendSuccess(res, { message: "Logged out successfully" });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await this.service.logoutAll(req.user!.userId);
    res.clearCookie("refresh_token");
    sendSuccess(res, { message: "All sessions revoked" });
  });

  setup2FA = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.setup2FA(req.user!.userId);
    sendSuccess(res, result);
  });

  verify2FA = asyncHandler(async (req: Request, res: Response) => {
    await this.service.verify2FA(req.user!.userId, req.body.otp_code);
    sendSuccess(res, { message: "2FA enabled successfully" });
  });

  disable2FA = asyncHandler(async (req: Request, res: Response) => {
    await this.service.disable2FA(req.user!.userId, req.body.otp_code);
    sendSuccess(res, { message: "2FA disabled successfully" });
  });
}
