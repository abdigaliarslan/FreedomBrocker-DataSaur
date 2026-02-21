CREATE TABLE IF NOT EXISTS ticket_assignment (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id        UUID NOT NULL REFERENCES tickets(id),
    manager_id       UUID NOT NULL REFERENCES managers(id),
    business_unit_id UUID NOT NULL REFERENCES business_units(id),
    assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    routing_reason   TEXT,
    is_current       BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_assignment_ticket ON ticket_assignment(ticket_id);
CREATE INDEX IF NOT EXISTS idx_assignment_manager ON ticket_assignment(manager_id) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_active ON ticket_assignment(ticket_id) WHERE is_current = true;
