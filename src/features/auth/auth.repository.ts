import { pool } from "@db/pool";
import { User } from "@features/users/user.types";

export class AuthRepository {
  async findByPhone(phone_number: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT * FROM users WHERE phone_number = $1 AND deleted_at IS NULL`,
      [phone_number],
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT * FROM users WHERE email = $1 and deleted_at IS NULL`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT * FROM users WHERE username = $1 and deleted_at IS NULL`,
      [username],
    );
    return rows[0] ?? null;
  }

  async createUser(data: {
    phone_number: string;
    username: string;
    full_name: string;
    password: string;
    email: string | null;
    role: "user" | "admin";
  }): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (phone_number, username, full_name, password, email, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING * `,
      [
        data.phone_number,
        data.username,
        data.full_name,
        data.password,
        data.email,
        data.role,
      ],
    );

    return rows[0];
  }

  async saveTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET two_factor_secret = $1, two_factor_enabled = false
       WHERE id = $2`,
      [secret, userId],
    );
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET two_factor_enabled = true, otp_verified = true
       WHERE id = $1`,
      [userId],
    );
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           otp_verified = false
       WHERE id = $1`,
      [userId],
    );
  }

  async saveRefreshToken(data: {
    user_id: string;
    token: string;
    expires_at: Date;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens
         (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        data.user_id,
        data.token,
        data.expires_at,
        data.ip_address ?? null,
        data.user_agent ?? null,
      ],
    );
  }

  async findRefreshToken(token: string) {
    const { rows } = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [token],
    );
    return rows[0] ?? null;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token = $1`,
      [token],
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  async logLoginAttempt(data: {
    identifier: string;
    success: boolean;
    ip_address?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO login_attempts (identifier, success, ip_address)
       VALUES ($1, $2, $3)`,
      [data.identifier, data.success, data.ip_address ?? null],
    );
  }

  async countRecentFailedAttempts(
    identifier: string,
    windowMinutes = 15,
  ): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM login_attempts
       WHERE identifier = $1
         AND success = false
         AND attempted_at > NOW() - INTERVAL '1 minute' * $2`,
      [identifier, windowMinutes],
    );
    return parseInt(rows[0].count, 10);
  }
}
