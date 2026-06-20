import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { AuthRepository } from "./auth.repository";
import {
  RegisterDTO,
  LoginDTO,
  JwtPayload,
  TokenPair,
  AuthResponse,
  TwoFactorRequired,
} from "./auth.types";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from "../../shared/AppError";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";

const log = logger.child({ module: "AuthService" });

export class AuthService {
  constructor(private repo = new AuthRepository()) {}

  private generateAccessToken(payload: Omit<JwtPayload, "type">): string {
    return jwt.sign({ ...payload, type: "access" }, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as jwt.SignOptions);
  }

  private generateRefreshToken(payload: Omit<JwtPayload, "type">): string {
    return jwt.sign({ ...payload, type: "refresh" }, env.JWT_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    } as jwt.SignOptions);
  }

  private getRefreshTokenExpiry(): Date {
    const days = env.JWT_REFRESH_EXPIRY.includes("d")
      ? parseInt(env.JWT_REFRESH_EXPIRY)
      : 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private async issueTokenPair(
    userId: string,
    role: "user" | "admin",
    meta: { ip_address?: string; user_agent?: string },
  ): Promise<TokenPair> {
    const payload = { userId, role };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    await this.repo.saveRefreshToken({
      user_id: userId,
      token: refreshToken,
      expires_at: this.getRefreshTokenExpiry(),
      ...meta,
    });

    return { accessToken, refreshToken };
  }

  async register(data: RegisterDTO) {
    const existing = await this.repo.findByPhone(data.phone_number);
    if (existing) throw new ValidationError("Phone number already exists");

    const existingEmail = await this.repo.findByEmail(data.email ?? "");
    if (existingEmail) throw new ValidationError("Email already exists");

    const existingUsername = await this.repo.findByUsername(
      data.username ?? "",
    );
    if (existingUsername) throw new ValidationError("Username already exists");

    const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

    const user = await this.repo.createUser({
      phone_number: data.phone_number,
      username: data.username,
      full_name: data.full_name,
      email: data.email ?? null,
      password: hashedPassword,
      role: data.role ?? "user",
    });

    if (!user) throw new NotFoundError("User");

    log.info({ userId: user.id, role: user.role }, "User registered");

    const { password, two_factor_secret, ...safeUser } = user as any;
    return safeUser;
  }

  async login(
    data: LoginDTO,
    meta: { ip_address?: string; user_agent?: string },
  ): Promise<AuthResponse | TwoFactorRequired> {
    const user = await this.repo.findByPhone(data.phone_number);

    const failedAttempts = await this.repo.countRecentFailedAttempts(
      data.phone_number,
    );
    if (failedAttempts >= 5) {
      throw new AppError(
        "Too many failed attempts. Try again in 15 minutes.",
        429,
        "TOO_MANY_ATTEMPTS",
      );
    }

    if (!user || !user.password) {
      await this.repo.logLoginAttempt({
        identifier: data.phone_number,
        success: false,
        ...meta,
      });
      throw new ValidationError("Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      await this.repo.logLoginAttempt({
        identifier: data.phone_number,
        success: false,
        ...meta,
      });
      throw new ValidationError("Invalid Credentials!");
    }

    if (!user.is_active) {
      throw new AppError("Account is deactivated", 403, "ACCOUNT_DEACTIVATED");
    }

    if (user.two_factor_enabled) {
      if (!data.otp_code) {
        return {
          two_factor_required: true,
          user_id: user.id,
        };
      }

      const valid = speakeasy.totp.verify({
        secret: user.two_factor_secret!,
        encoding: "base32",
        token: data.otp_code,
        window: 1,
      });

      if (!valid) {
        await this.repo.logLoginAttempt({
          identifier: data.phone_number,
          success: false,
          ...meta,
        });
        throw new AppError("Invalid OTP code", 400, "INVALID_OTP");
      }
    }

    await this.repo.logLoginAttempt({
      identifier: data.phone_number,
      success: true,
      ...meta,
    });

    const tokens = await this.issueTokenPair(
      user.id,
      user.role as "user" | "admin",
      meta,
    );

    log.info({ userId: user.id, role: user.role }, "User logged in");

    return {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role as "admin" | "user",
        two_factor_enabled: user.two_factor_enabled,
        avatar_url: user.avatar_url,
        bio: user.bio,
        custom_status: user.custom_status,
        email: user.email,
        is_active: user.is_active,
        is_online: user.is_online,
        is_verified: user.is_verified,
        otp_verified: user.otp_verified,
        status_emoji: user.status_emoji,
        last_seen: user.last_seen.toISOString(),
        created_at: user.created_at.toISOString(),
        deleted_at: user.deleted_at ? user.deleted_at.toISOString() : null,
      },
      tokens,
    } as any;
  }

  async refreshTokens(
    refreshToken: string,
    meta: { ip_address?: string; user_agent?: string },
  ): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError();
    }

    if (payload.type !== "refresh") throw new UnauthorizedError();

    const storedToken = await this.repo.findRefreshToken(refreshToken);
    if (!storedToken) throw new UnauthorizedError();

    await this.repo.revokeRefreshToken(refreshToken);
    return this.issueTokenPair(payload.userId, payload.role, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.repo.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repo.revokeAllUserTokens(userId);
    log.info({ userId }, "All sessions revoked");
  }

  async setup2FA(userId: string): Promise<{ qr_code: string; secret: string }> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User");

    const secret = speakeasy.generateSecret({
      name: `NexusChat (${user.phone_number})`,
      length: 20,
    });

    await this.repo.saveTwoFactorSecret(userId, secret.base32);

    const qr_code = await QRCode.toDataURL(secret.otpauth_url!);

    log.info({ userId }, "2FA secret generated");
    return { qr_code, secret: secret.base32 };
  }

  async verify2FA(userId: string, otp_code: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User");
    if (!user.two_factor_secret) {
      throw new ValidationError("2FA not set up. Call /auth/2fa/setup first.");
    }

    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: otp_code,
      window: 1,
    });

    if (!valid) throw new AppError("Invalid OTP code", 400, "INVALID_OTP");

    await this.repo.enableTwoFactor(userId);
    log.info({ userId }, "2FA enabled");
  }

  async disable2FA(userId: string, otp_code: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User");
    if (!user.two_factor_enabled) {
      throw new ValidationError("2FA is not enabled");
    }

    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret!,
      encoding: "base32",
      token: otp_code,
      window: 1,
    });

    if (!valid) throw new AppError("Invalid OTP code", 400, "INVALID_OTP");

    await this.repo.disableTwoFactor(userId);
    log.info({ userId }, "2FA disabled");
  }
}
