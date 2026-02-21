CREATE TABLE IF NOT EXISTS ticket_ai (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id            UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    type                 TEXT,
    sentiment            TEXT,
    priority_1_10        INT CHECK (priority_1_10 BETWEEN 1 AND 10),
    lang                 TEXT DEFAULT 'RU',
    summary              TEXT,
    recommended_actions  JSONB DEFAULT '[]',
    lat                  DOUBLE PRECISION,
    lon                  DOUBLE PRECISION,
    geo_status           TEXT DEFAULT 'unknown',
    confidence_type      DOUBLE PRECISION,
    confidence_sentiment DOUBLE PRECISION,
    confidence_priority  DOUBLE PRECISION,
    enriched_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_ai_ticket ON ticket_ai(ticket_id);
