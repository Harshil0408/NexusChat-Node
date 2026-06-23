import { ContactRepository } from "./contact.repository";
import { SendFriendRequestDTO } from "./contact.types";
import { AppError, NotFoundError, ValidationError } from "@shared/AppError";
import { pool } from "@db/pool";
import { logger } from "@shared/logger";
import { emitToUser } from "../../socket/socket";
import { notificationService } from "@shared/feature/notification/notification.service";

const log = logger.child({ module: "ContactService" });

export class ContactService {
  constructor(private repo = new ContactRepository()) {}

  // ── Friend Requests ────────────────────────────────────────

  async sendFriendRequest(senderId: string, data: SendFriendRequestDTO) {
    if (senderId === data.receiver_id) {
      throw new ValidationError("You cannot send a request to yourself");
    }

    // Check receiver exists
    const { rows: users } = await pool.query(
      `SELECT id, username, full_name, avatar_url FROM users
       WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
      [data.receiver_id],
    );
    if (!users[0]) throw new NotFoundError("User");

    const receiver = users[0];

    // Check if blocked
    const blocked = await this.repo.isBlocked(data.receiver_id, senderId);
    if (blocked) throw new AppError("Cannot send request", 403, "BLOCKED");

    const blockedByMe = await this.repo.isBlocked(senderId, data.receiver_id);
    if (blockedByMe)
      throw new AppError("Unblock this user first", 403, "BLOCKED");

    // Check if already contacts
    const alreadyContacts = await this.repo.isContact(
      senderId,
      data.receiver_id,
    );
    if (alreadyContacts) throw new ValidationError("Already in your contacts");

    // Check existing pending request from receiver to sender
    const reverseRequest = await this.repo.findRequest(
      data.receiver_id,
      senderId,
    );
    if (reverseRequest?.status === "pending") {
      throw new ValidationError(
        "This user already sent you a request. Accept it instead.",
      );
    }

    const request = await this.repo.sendRequest(
      senderId,
      data.receiver_id,
      data.message,
    );

    // Get sender info for notification
    const { rows: senders } = await pool.query(
      `SELECT username, full_name, avatar_url FROM users WHERE id = $1`,
      [senderId],
    );
    const sender = senders[0];

    // Real-time event to receiver
    emitToUser(data.receiver_id, "friend_request:received", {
      request_id: request.id,
      sender_id: senderId,
      sender_username: sender.username,
      sender_full_name: sender.full_name,
      sender_avatar: sender.avatar_url,
      message: request.message,
      created_at: request.created_at,
    });

    // Persistent notification
    await notificationService.send({
      user_id: data.receiver_id,
      type: "friend_request",
      title: "New friend request",
      body: `${sender.full_name} sent you a friend request`,
      image_url: sender.avatar_url,
      data: {
        request_id: request.id,
        sender_id: senderId,
      },
    });

    log.info({ senderId, receiverId: data.receiver_id }, "Friend request sent");
    return request;
  }

  async acceptFriendRequest(requestId: string, userId: string) {
    const request = await this.repo.findRequestById(requestId);
    if (!request) throw new NotFoundError("Friend request");

    if (request.receiver_id !== userId) {
      throw new AppError("Not your request to accept", 403, "FORBIDDEN");
    }

    if (request.status !== "pending") {
      throw new ValidationError(`Request is already ${request.status}`);
    }

    if (new Date() > new Date(request.expires_at)) {
      throw new ValidationError("This request has expired");
    }

    // Update request status
    await this.repo.updateRequestStatus(requestId, "accepted");

    // Create contact pair (both directions)
    await this.repo.createContactPair(request.sender_id, request.receiver_id);

    // Get acceptor info
    const { rows: acceptors } = await pool.query(
      `SELECT username, full_name, avatar_url FROM users WHERE id = $1`,
      [userId],
    );
    const acceptor = acceptors[0];

    // Real-time event to original sender
    emitToUser(request.sender_id, "friend_request:accepted", {
      request_id: requestId,
      accepted_by_id: userId,
      accepted_by_username: acceptor.username,
      accepted_by_full_name: acceptor.full_name,
      accepted_by_avatar: acceptor.avatar_url,
    });

    // Notify sender
    await notificationService.send({
      user_id: request.sender_id,
      type: "friend_request_accepted",
      title: "Friend request accepted",
      body: `${acceptor.full_name} accepted your friend request`,
      image_url: acceptor.avatar_url,
      data: {
        request_id: requestId,
        contact_user_id: userId,
      },
    });

    log.info({ requestId, userId }, "Friend request accepted");
    return { message: "Friend request accepted" };
  }

  async declineFriendRequest(requestId: string, userId: string) {
    const request = await this.repo.findRequestById(requestId);
    if (!request) throw new NotFoundError("Friend request");

    if (request.receiver_id !== userId) {
      throw new AppError("Not your request to decline", 403, "FORBIDDEN");
    }

    if (request.status !== "pending") {
      throw new ValidationError(`Request is already ${request.status}`);
    }

    await this.repo.updateRequestStatus(requestId, "declined");

    // Notify sender (optional — some apps don't notify on decline)
    emitToUser(request.sender_id, "friend_request:declined", {
      request_id: requestId,
      declined_by_id: userId,
    });

    log.info({ requestId, userId }, "Friend request declined");
    return { message: "Friend request declined" };
  }

  async cancelFriendRequest(requestId: string, userId: string) {
    const request = await this.repo.findRequestById(requestId);
    if (!request) throw new NotFoundError("Friend request");

    if (request.sender_id !== userId) {
      throw new AppError("Not your request to cancel", 403, "FORBIDDEN");
    }

    if (request.status !== "pending") {
      throw new ValidationError(`Request is already ${request.status}`);
    }

    await this.repo.updateRequestStatus(requestId, "cancelled");

    // Notify receiver that request was withdrawn
    emitToUser(request.receiver_id, "friend_request:cancelled", {
      request_id: requestId,
      cancelled_by_id: userId,
    });

    log.info({ requestId, userId }, "Friend request cancelled");
    return { message: "Friend request cancelled" };
  }

  async markRequestSeen(requestId: string, userId: string) {
    const request = await this.repo.findRequestById(requestId);
    if (!request) throw new NotFoundError("Friend request");
    if (request.receiver_id !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    await this.repo.markRequestSeen(requestId);
  }

  async getPendingReceived(userId: string) {
    return this.repo.getPendingReceived(userId);
  }

  async getPendingSent(userId: string) {
    return this.repo.getPendingSent(userId);
  }

  async getRequestHistory(userId: string) {
    return this.repo.getRequestHistory(userId);
  }

  // ── Contacts ───────────────────────────────────────────────

  async getContacts(userId: string) {
    return this.repo.getContacts(userId);
  }

  async getFavoriteContacts(userId: string) {
    return this.repo.getFavoriteContacts(userId);
  }

  async searchContacts(userId: string, query: string) {
    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters");
    }
    return this.repo.searchContacts(userId, query.trim());
  }

  async updateNickname(
    contactId: string,
    userId: string,
    nickname: string | null,
  ) {
    const contact = await this.repo.findContactById(contactId, userId);
    if (!contact) throw new NotFoundError("Contact");
    return this.repo.updateContact(contactId, userId, { nickname });
  }

  async toggleFavorite(contactId: string, userId: string) {
    const contact = await this.repo.findContactById(contactId, userId);
    if (!contact) throw new NotFoundError("Contact");
    return this.repo.updateContact(contactId, userId, {
      favorite: !contact.favorite,
    });
  }

  async muteContact(contactId: string, userId: string, mutedUntil?: string) {
    const contact = await this.repo.findContactById(contactId, userId);
    if (!contact) throw new NotFoundError("Contact");

    const muted_until = mutedUntil ? new Date(mutedUntil) : null;
    return this.repo.updateContact(contactId, userId, {
      muted: true,
      muted_until,
    });
  }

  async unmuteContact(contactId: string, userId: string) {
    const contact = await this.repo.findContactById(contactId, userId);
    if (!contact) throw new NotFoundError("Contact");
    return this.repo.updateContact(contactId, userId, {
      muted: false,
      muted_until: null,
    });
  }

  async blockContact(userId: string, contactUserId: string) {
    if (userId === contactUserId) {
      throw new ValidationError("Cannot block yourself");
    }
    await this.repo.blockContact(userId, contactUserId);
    log.info({ userId, contactUserId }, "Contact blocked");
    return { message: "User blocked" };
  }

  async unblockContact(userId: string, contactUserId: string) {
    await this.repo.unblockContact(userId, contactUserId);
    log.info({ userId, contactUserId }, "Contact unblocked");
    return { message: "User unblocked" };
  }

  async getBlockedContacts(userId: string) {
    return this.repo.getBlockedContacts(userId);
  }

  async removeContact(userId: string, contactUserId: string) {
    const isContact = await this.repo.isContact(userId, contactUserId);
    if (!isContact) throw new NotFoundError("Contact");
    await this.repo.removeContact(userId, contactUserId);
    log.info({ userId, contactUserId }, "Contact removed");
    return { message: "Contact removed" };
  }
}
