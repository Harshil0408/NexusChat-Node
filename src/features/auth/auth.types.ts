export interface RegisterDTO {
  phone_number: string;
  username: string;
  full_name: string;
  password: string;
  email?: string;
  role?: "user" | "admin";
}

export interface LoginDTO {
  phone_number: string;
  password: string;
  otp_code?: string;
}

export interface JwtPayload {
  userId: string;
  role: "user" | "admin";
  type: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    phone_number: string;
    email: string | null;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    status_emoji: string | null;
    custom_status: unknown;

    last_seen: string;
    created_at: string;
    deleted_at: string | null;

    is_online: boolean;
    is_verified: boolean;
    is_active: boolean;
    role: "user" | "admin";
    two_factor_enabled: boolean;
    otp_verified: boolean;
  };
  tokens: TokenPair;
}

export interface TwoFactorRequired {
  two_factor_required: true;
  user_id: string;
}
