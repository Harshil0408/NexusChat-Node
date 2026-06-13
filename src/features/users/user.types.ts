export interface User {
  id: string;
  phone_number: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  status_emoji: string;
  custom_status: string | null;
  last_seen: Date;
  is_online: boolean;
  is_verified: boolean;
  is_active: boolean;
  two_factor_enabled: boolean;
  account_type: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  password: string;
  role: "admin" | "user";
  refresh_token: string;
  otp_verified: boolean;
  two_factor_secret: string;
}

export interface CreateUserDTO {
  phone_number: string;
  username: string;
  full_name: string;
  email: string;
}

export interface UpdateUserDTO {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  status_emoji?: string;
  custom_status?: string;
  email: string;
}
