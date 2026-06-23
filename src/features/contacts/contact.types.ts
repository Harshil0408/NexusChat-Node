export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  status: "pending" | "accepted" | "blocked" | "declined";
  nickname: string | null;
  favorite: boolean;
  muted: boolean;
  muted_until: Date | null;
  blocked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  message: string | null;
  seen_at: Date | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SendFriendRequestDTO {
  receiver_id: string;
  message?: string;
}

export interface UpdateNicknameDTO {
  nickname: string;
}

export interface MuteContactDTO {
  muted_until?: string;
}
