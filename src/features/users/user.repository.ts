import { pool } from "@db/pool";
import { UpdateUserDTO, User } from "./user.types";

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT id, phone_number, email, username, full_name,
              avatar_url, bio, status_emoji, custom_status,
              last_seen, is_online, is_verified, is_active,
              two_factor_enabled, role, account_type,
              created_at, updated_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findAll(): Promise<User[]> {
    const { rows } = await pool.query<User>(
      `SELECT id, phone_number, email, username, full_name,
              avatar_url, is_verified, is_active,
              two_factor_enabled, role, created_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`,
    );
    return rows;
  }

  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const fields = Object.keys(data) as (keyof UpdateUserDTO)[];
    if (fields.length === 0) return this.findById(id);

    const setClause = fields.map((key, i) => `${key} = $${i + 2}`).join(", ");
    const values = fields.map((key) => data[key]);

    const { rows } = await pool.query<User>(
      `UPDATE users
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, ...values],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE users
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
