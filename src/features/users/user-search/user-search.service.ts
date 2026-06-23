import { logger } from "@shared/logger";
import { UserSearchRepository } from "./user-search.repository";
import { NotFoundError, ValidationError } from "@shared/AppError";

const log = logger.child({ module: "UserSearchService" });

export class UserSearchService {
  constructor(private repo = new UserSearchRepository()) {}

  async search(query: string, currentUserId: string, limit = 20, offset = 0) {
    if (!query || query.trim().length < 2) {
      throw new ValidationError("Search query must be at least 2 characters.");
    }

    const results = await this.repo.searchUsers(
      query.trim(),
      currentUserId,
      limit,
      offset,
    );

    return results.map((user) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      is_online: user.is_online,
      last_seen: user.last_seen,
      is_verified: user.is_verified,
      status_emoji: user.status_emoji,
      custom_status: user.custom_status,
      bio: user.bio,
      // tells frontend exactly what button to show
      //   relationship: this.resolveRelationship(user),
    }));
  }

  async searchByPhone(phone: string, currentUserId: string) {
    if (!phone || phone.trim().length < 5) {
      throw new ValidationError("Enter a valid phone number");
    }

    const user = await this.repo.searchByPhone(phone.trim(), currentUserId);
    if (!user) return null;

    return {
      ...user,
      relationship: this.resolveRelationship(user),
    };
  }

  async getUserProfile(targetUserId: string, currentUserId: string) {
    const user = await this.repo.getUserProfile(targetUserId, currentUserId);
    if (!user) throw new NotFoundError("User");

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      is_verified: user.is_verified,
      is_online: user.is_online,
      last_seen: user.last_seen,
      status_emoji: user.status_emoji,
      custom_status: user.custom_status,
      created_at: user.created_at,
      contact_nickname: user.contact_nickname,
      contact_favorite: user.contact_favorite,
      contact_muted: user.contact_muted,
      relationship: this.resolveRelationship(user),
    };
  }

  private resolveRelationship(user: any): {
    status:
      | "none"
      | "contact"
      | "blocked"
      | "request_sent"
      | "request_received";
    request_id?: string;
  } {
    // Already a contact
    if (user.contact_status === "accepted") {
      return { status: "contact" };
    }

    // Blocked by me
    if (user.contact_status === "blocked") {
      return { status: "blocked" };
    }

    // I sent them a pending request
    if (user.request_sent_status === "pending") {
      return { status: "request_sent", request_id: user.request_sent_id };
    }

    // They sent me a pending request
    if (user.request_received_status === "pending") {
      return {
        status: "request_received",
        request_id: user.request_received_id,
      };
    }

    // No relationship
    return { status: "none" };
  }
}
