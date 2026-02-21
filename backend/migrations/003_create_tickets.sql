CREATE TABLE IF NOT EXISTS tickets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id    TEXT UNIQUE,
    subject        TEXT NOT NULL,
    body           TEXT NOT NULL,
    client_name    TEXT,
    client_segment TEXT,
    source_channel TEXT,
    status         TEXT NOT NULL DEFAULT 'new',
    raw_address    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
