CREATE TABLE IF NOT EXISTS business_units (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    city       TEXT NOT NULL,
    address    TEXT,
    lat        DOUBLE PRECISION,
    lon        DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
