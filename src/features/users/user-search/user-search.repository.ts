import { pool } from "@db/pool";

export class UserSearchRepository {
  async searchUsers(
    query: string,
    currentUserId: string,
    limit = 20,
    offset = 0,
  ) {
    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.full_name,
         u.avatar_url,
         u.is_online,
         u.last_seen,
         u.is_verified,
         u.status_emoji,
         u.custom_status,
         u.bio,
         -- relationship status with current user
         c.status AS contact_status,
         fr_sent.status     AS request_sent_status,
         fr_sent.id         AS request_sent_id,
         fr_received.status AS request_received_status,
         fr_received.id     AS request_received_id
       FROM users u
       -- check if already a contact
       LEFT JOIN contacts c
         ON c.user_id = $2 AND c.contact_user_id = u.id
       -- check if current user sent a request to this user
       LEFT JOIN friend_requests fr_sent
         ON fr_sent.sender_id = $2 AND fr_sent.receiver_id = u.id
       -- check if this user sent a request to current user
       LEFT JOIN friend_requests fr_received
         ON fr_received.sender_id = u.id AND fr_received.receiver_id = $2
       WHERE u.deleted_at IS NULL
         AND u.is_active = true
         AND u.id != $2
         AND (
           u.username  ILIKE $1 OR
           u.full_name ILIKE $1 OR
           u.phone_number = $3
         )
       ORDER BY
         -- exact username match first
         CASE WHEN u.username ILIKE $4 THEN 0 ELSE 1 END,
         u.full_name ASC
       LIMIT $5 OFFSET $6`,
      [
        `%${query}%`, // $1 — ILIKE pattern
        currentUserId, // $2 — exclude self + join contacts
        query, // $3 — exact phone match
        query, // $4 — exact username for sorting
        limit, // $5
        offset, // $6
      ],
    );
    return rows;
  }

  async searchByPhone(phone: string, currentUserId: string) {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.username, u.full_name,
         u.avatar_url, u.is_verified, u.is_online,
         u.status_emoji,
         c.status AS contact_status,
         fr_sent.status AS request_sent_status,
         fr_sent.id     AS request_sent_id
       FROM users u
       LEFT JOIN contacts c
         ON c.user_id = $2 AND c.contact_user_id = u.id
       LEFT JOIN friend_requests fr_sent
         ON fr_sent.sender_id = $2 AND fr_sent.receiver_id = u.id
       WHERE u.phone_number = $1
         AND u.deleted_at IS NULL
         AND u.is_active = true
         AND u.id != $2`,
      [phone, currentUserId],
    );
    return rows[0] ?? null;
  }

  async getUserProfile(targetUserId: string, currentUserId: string) {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.username, u.full_name,
         u.avatar_url, u.bio, u.is_verified,
         u.is_online, u.last_seen,
         u.status_emoji, u.custom_status,
         u.created_at,
         c.status          AS contact_status,
         c.nickname        AS contact_nickname,
         c.favorite        AS contact_favorite,
         c.muted           AS contact_muted,
         fr_sent.status    AS request_sent_status,
         fr_sent.id        AS request_sent_id,
         fr_received.status AS request_received_status,
         fr_received.id    AS request_received_id
       FROM users u
       LEFT JOIN contacts c
         ON c.user_id = $2 AND c.contact_user_id = u.id
       LEFT JOIN friend_requests fr_sent
         ON fr_sent.sender_id = $2 AND fr_sent.receiver_id = u.id
       LEFT JOIN friend_requests fr_received
         ON fr_received.sender_id = u.id AND fr_received.receiver_id = $2
       WHERE u.id = $1
         AND u.deleted_at IS NULL
         AND u.is_active = true`,
      [targetUserId, currentUserId],
    );
    return rows[0] ?? null;
  }
}
