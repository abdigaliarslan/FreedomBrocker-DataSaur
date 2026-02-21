CREATE TABLE IF NOT EXISTS managers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        TEXT NOT NULL,
    email            TEXT UNIQUE,
    business_unit_id UUID NOT NULL REFERENCES business_units(id),
    is_vip_skill     BOOLEAN NOT NULL DEFAULT false,
    is_chief_spec    BOOLEAN NOT NULL DEFAULT false,
    languages        TEXT[] NOT NULL DEFAULT '{RU}',
    max_load         INT NOT NULL DEFAULT 50,
    current_load     INT NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_managers_bu ON managers(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_managers_load ON managers(current_load) WHERE is_active = true;
