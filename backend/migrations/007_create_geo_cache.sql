CREATE TABLE IF NOT EXISTS geo_cache (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_address   TEXT NOT NULL UNIQUE,
    lat           DOUBLE PRECISION,
    lon           DOUBLE PRECISION,
    resolved_city TEXT,
    geo_status    TEXT NOT NULL DEFAULT 'unknown',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_cache_address ON geo_cache(raw_address);
