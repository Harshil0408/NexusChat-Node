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
    username: string;
    full_name: string;
    phone_number: string;
    role: string;
    two_factor_enabled: boolean;
  };
  tokens: TokenPair;
}

export interface TwoFactorRequired {
  two_factor_required: true;
  user_id: string;
}
