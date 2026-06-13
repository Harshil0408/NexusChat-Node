CREATE TYPE contact_status AS ENUM ('pending', 'accepted', 'blocked', 'declined');

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