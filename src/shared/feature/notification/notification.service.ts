import { pool } from "@db/pool";
import { logger } from "@shared/logger";
import { emitToUser } from "../../../socket/socket";

const log = logger.child({ module: "NotificationService" });

export interface CreateNotificationPayload {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  image_url?: string;
}

export type NotificationType =
  | "message"
  | "call"
  | "friend_request"
  | "friend_request_accepted"
  | "friend_request_declined"
  | "friend_request_cancelled"
  | "group_invite"
  | "mention"
  | "reaction"
  | "system";

export class NotificationService {
  async send(payload: CreateNotificationPayload): Promise<void> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO notifications
           (user_id, type, title, body, data, image_url, is_delivered, delivered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          payload.user_id,
          payload.type,
          payload.title,
          payload.body,
          JSON.stringify(payload.data ?? {}),
          payload.image_url ?? null,
          false,
          null,
        ],
      );

      const notification = rows[0];

      emitToUser(payload.user_id, "notification:new", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        image_url: notification.image_url,
        is_read: false,
        created_at: notification.created_at,
      });

      await pool.query(
        `UPDATE notifications
         SET is_delivered = true, delivered_at = NOW()
         WHERE id = $1`,
        [notification.id],
      );
    } catch (err) {
      log.error({ err, payload }, "Failed to send notification");
    }
  }

  async sentToMany(
    userIds: string[],
    payload: Omit<CreateNotificationPayload, "user_id">,
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((userId) => this.send({ ...payload, user_id: userId })),
    );
  }

  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications
        WHERE user_id = $1 AND is_read = false
        `,
      [userId],
    );
    return parseInt(rows[0].count, 10);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
  }
}

export const notificationService = new NotificationService();
