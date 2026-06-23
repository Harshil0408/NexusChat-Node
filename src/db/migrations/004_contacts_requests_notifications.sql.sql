CREATE TYPE contact_status AS ENUM ('pending', 'accepted', 'blocked', 'declined');

CREATE TYPE request_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'cancelled',
    'expired'
);

CREATE TYPE notification_type AS ENUM (
    'message',
    'call',
    'friend_request',
    'friend_request_accepted',
    'friend_request_declined',
    'friend_request_cancelled',
    'group_invite',
    'mention',
    'reaction',
    'system'
);

CREATE TABLE
    contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        contact_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        status contact_status DEFAULT 'pending',
        nickname VARCHAR(50),
        favorite BOOLEAN DEFAULT false,
        muted BOOLEAN DEFAULT false,
        muted_until TIMESTAMP
        WITH
            TIME ZONE,
            blocked_at TIMESTAMP
        WITH
            TIME ZONE,
            created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, contact_user_id)
    );

CREATE INDEX idx_contacts_user ON contacts (user_id);

CREATE INDEX idx_contacts_contact ON contacts (contact_user_id);

CREATE INDEX idx_contacts_status ON contacts (status);

CREATE TABLE
    friend_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        status request_status DEFAULT 'pending',
        message TEXT,
        seen_at TIMESTAMP
        WITH
            TIME ZONE,
            expires_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
            created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (sender_id, receiver_id)
    );

CREATE INDEX idx_fr_sender ON friend_requests (sender_id);

CREATE INDEX idx_fr_receiver ON friend_requests (receiver_id);

CREATE INDEX idx_fr_status ON friend_requests (status);

CREATE TABLE
    notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        data JSONB DEFAULT '{}',
        image_url TEXT,
        is_read BOOLEAN DEFAULT false,
        is_delivered BOOLEAN DEFAULT false,
        delivered_at TIMESTAMP
        WITH
            TIME ZONE,
            read_at TIMESTAMP
        WITH
            TIME ZONE,
            created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read);