CREATE TABLE
    refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        revoked_at TIMESTAMPTZ,
        ip_address TEXT,
        user_agent TEXT
    );

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);

CREATE TABLE
    login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        identifier TEXT NOT NULL, -- phone or email
        success BOOLEAN NOT NULL DEFAULT false,
        ip_address TEXT,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE INDEX idx_login_attempts_identifier ON login_attempts (identifier);