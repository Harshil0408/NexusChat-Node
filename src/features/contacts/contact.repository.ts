import { pool } from "@db/pool";
import { Contact, FriendRequest } from "./contact.types";

export class ContactRepository {
  async sendRequest(
    senderId: string,
    receiverId: string,
    message?: string,
  ): Promise<FriendRequest> {
    const { rows } = await pool.query<FriendRequest>(
      `INSERT INTO friend_requests (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       ON CONFLICT (sender_id, receiver_id)
       DO UPDATE SET
         status = 'pending',
         message = EXCLUDED.message,
         expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days',
         updated_at = NOW()
       RETURNING *`,
      [senderId, receiverId, message ?? null],
    );
    return rows[0];
  }

  async findRequest(
    senderId: string,
    receiverId: string,
  ): Promise<FriendRequest | null> {
    const { rows } = await pool.query(
      `SELECT * FROM friend_requests 
        WHERE sender_id = $1  AND receiver_id = $2
        `,
      [senderId, receiverId],
    );
    return rows[0] ?? null;
  }

  async findRequestById(id: string): Promise<FriendRequest | null> {
    const { rows } = await pool.query<FriendRequest>(
      `SELECT fr.*,
         s.username AS sender_username, s.full_name AS sender_full_name,
         s.avatar_url AS sender_avatar,
         r.username AS receiver_username, r.full_name AS receiver_full_name,
         r.avatar_url AS receiver_avatar
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_id
       JOIN users r ON r.id = fr.receiver_id
       WHERE fr.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async updateRequestStatus(
    id: string,
    status: "accepted" | "declined" | "cancelled",
  ): Promise<FriendRequest | null> {
    const { rows } = await pool.query<FriendRequest>(
      `UPDATE friend_requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    return rows[0] ?? null;
  }

  async markRequestSeen(requestId: string): Promise<void> {
    await pool.query(
      `UPDATE friend_requests
       SET seen_at = NOW()
       WHERE id = $1 AND seen_at IS NULL`,
      [requestId],
    );
  }

  async getPendingReceived(userId: string) {
    const { rows } = await pool.query(
      `SELECT fr.*,
         u.username AS sender_username,
         u.full_name AS sender_full_name,
         u.avatar_url AS sender_avatar,
         u.is_verified AS sender_verified
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = $1
         AND fr.status = 'pending'
         AND fr.expires_at > NOW()
       ORDER BY fr.created_at DESC`,
      [userId],
    );
    return rows;
  }

  async getPendingSent(userId: string) {
    const { rows } = await pool.query(
      `SELECT fr.*,
         u.username AS receiver_username,
         u.full_name AS receiver_full_name,
         u.avatar_url AS receiver_avatar,
         u.is_verified AS receiver_verified
       FROM friend_requests fr
       JOIN users u ON u.id = fr.receiver_id
       WHERE fr.sender_id = $1
         AND fr.status = 'pending'
         AND fr.expires_at > NOW()
       ORDER BY fr.created_at DESC`,
      [userId],
    );
    return rows;
  }

  async getRequestHistory(userId: string) {
    const { rows } = await pool.query(
      `SELECT fr.*,
         s.username AS sender_username, s.full_name AS sender_full_name, s.avatar_url AS sender_avatar,
         r.username AS receiver_username, r.full_name AS receiver_full_name, r.avatar_url AS receiver_avatar
       FROM friend_requests fr
       JOIN users s ON s.id = fr.sender_id
       JOIN users r ON r.id = fr.receiver_id
       WHERE fr.sender_id = $1 OR fr.receiver_id = $1
       ORDER BY fr.updated_at DESC`,
      [userId],
    );
    return rows;
  }

  async createContactPair(userAId: string, userBId: string): Promise<void> {
    await pool.query(
      `INSERT INTO contacts (user_id, contact_user_id, status)
       VALUES ($1, $2, 'accepted'), ($2, $1, 'accepted')
       ON CONFLICT (user_id, contact_user_id) DO UPDATE
       SET status = 'accepted', updated_at = NOW()`,
      [userAId, userBId],
    );
  }

  async getContacts(userId: string) {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.status, c.nickname, c.favorite,
         c.muted, c.muted_until, c.created_at,
         u.id AS user_id,
         u.username, u.full_name, u.avatar_url,
         u.is_online, u.last_seen,
         u.status_emoji, u.custom_status,
         u.is_verified
       FROM contacts c
       JOIN users u ON u.id = c.contact_user_id
       WHERE c.user_id = $1
         AND c.status = 'accepted'
         AND u.deleted_at IS NULL
       ORDER BY c.favorite DESC, u.full_name ASC`,
      [userId],
    );
    return rows;
  }

  async getFavoriteContacts(userId: string) {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.nickname, c.favorite, c.muted,
         u.id AS user_id, u.username, u.full_name,
         u.avatar_url, u.is_online, u.last_seen, u.status_emoji
       FROM contacts c
       JOIN users u ON u.id = c.contact_user_id
       WHERE c.user_id = $1 AND c.status = 'accepted' AND c.favorite = true
       ORDER BY u.full_name ASC`,
      [userId],
    );
    return rows;
  }

  async findContact(
    userId: string,
    contactUserId: string,
  ): Promise<Contact | null> {
    const { rows } = await pool.query(
      `SELECT * FROM contacts
        WHERE userId = $1 AND contact_user_id = $2
      `,
      [userId, contactUserId],
    );

    return rows[0] ?? null;
  }

  async findContactById(id: string, userId: string): Promise<Contact | null> {
    const { rows } = await pool.query<Contact>(
      `SELECT * FROM contacts WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async updateContact(
    id: string,
    userId: string,
    data: Partial<{
      nickname: string | null;
      favorite: boolean;
      muted: boolean;
      muted_until: Date | null;
    }>,
  ): Promise<Contact | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return null;

    const setClause = fields.map((k, i) => `${k} = $${i + 3}`).join(", ");
    const values = fields.map((k) => (data as any)[k]);

    const { rows } = await pool.query<Contact>(
      `UPDATE contacts
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, ...values],
    );
    return rows[0] ?? null;
  }

  async blockContact(userId: string, contactUserId: string): Promise<void> {
    await pool.query(
      `INSERT INTO contacts (user_id, contact_user_id, status, blocked_at)
       VALUES ($1, $2, 'blocked', NOW())
       ON CONFLICT (user_id, contact_user_id) DO UPDATE
       SET status = 'blocked', blocked_at = NOW(), updated_at = NOW()`,
      [userId, contactUserId],
    );
  }

  async unblockContact(userId: string, contactUserId: string): Promise<void> {
    await pool.query(
      `UPDATE contacts
       SET status = 'accepted', blocked_at = NULL, updated_at = NOW()
       WHERE user_id = $1 AND contact_user_id = $2`,
      [userId, contactUserId],
    );
  }

  async getBlockedContacts(userId: string) {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.blocked_at,
         u.id AS user_id, u.username, u.full_name, u.avatar_url
       FROM contacts c
       JOIN users u ON u.id = c.contact_user_id
       WHERE c.user_id = $1 AND c.status = 'blocked'
       ORDER BY c.blocked_at DESC`,
      [userId],
    );
    return rows;
  }

  async removeContact(userId: string, contactUserId: string): Promise<void> {
    // Remove both sides
    await pool.query(
      `DELETE FROM contacts
       WHERE (user_id = $1 AND contact_user_id = $2)
          OR (user_id = $2 AND contact_user_id = $1)`,
      [userId, contactUserId],
    );
  }

  async searchContacts(userId: string, query: string) {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.nickname, c.favorite,
         u.id AS user_id, u.username, u.full_name,
         u.avatar_url, u.is_online, u.status_emoji
       FROM contacts c
       JOIN users u ON u.id = c.contact_user_id
       WHERE c.user_id = $1
         AND c.status = 'accepted'
         AND (
           u.full_name ILIKE $2 OR
           u.username  ILIKE $2 OR
           c.nickname  ILIKE $2
         )
       ORDER BY u.full_name ASC
       LIMIT 20`,
      [userId, `%${query}%`],
    );
    return rows;
  }

  async isContact(userAId: string, userBId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT id FROM contacts
       WHERE user_id = $1 AND contact_user_id = $2 AND status = 'accepted'`,
      [userAId, userBId],
    );
    return rows.length > 0;
  }

  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT id FROM contacts
       WHERE user_id = $1 AND contact_user_id = $2 AND status = 'blocked'`,
      [userId, targetId],
    );
    return rows.length > 0;
  }
}
