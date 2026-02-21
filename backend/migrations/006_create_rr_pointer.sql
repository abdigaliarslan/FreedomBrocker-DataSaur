CREATE TABLE IF NOT EXISTS rr_pointer (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_unit_id UUID NOT NULL REFERENCES business_units(id),
    skill_group      TEXT NOT NULL DEFAULT 'general',
    last_manager_idx INT NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(business_unit_id, skill_group)
);
