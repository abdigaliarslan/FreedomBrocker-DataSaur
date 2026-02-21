-- n8n Compatibility Layer: Add missing columns and sync existing data

-- 1. Tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS segment TEXT;

UPDATE tickets SET 
    text = body, 
    address = raw_address, 
    segment = client_segment 
WHERE text IS NULL OR address IS NULL OR segment IS NULL;

-- 2. Ticket AI table
ALTER TABLE ticket_ai ADD COLUMN IF NOT EXISTS priority INT;
ALTER TABLE ticket_ai ADD COLUMN IF NOT EXISTS recommendation TEXT;
ALTER TABLE ticket_ai ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;
ALTER TABLE ticket_ai ADD COLUMN IF NOT EXISTS geo_country TEXT;
ALTER TABLE ticket_ai ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE ticket_ai SET
    priority = priority_1_10,
    recommendation = (CASE
        WHEN recommended_actions IS NOT NULL AND jsonb_array_length(recommended_actions) > 0
        THEN recommended_actions->>0
        ELSE ''
    END),
    updated_at = COALESCE(enriched_at, created_at)
WHERE priority IS NULL OR recommendation IS NULL;

-- 3. Managers table
ALTER TABLE managers ADD COLUMN IF NOT EXISTS office_id UUID;
ALTER TABLE managers ADD COLUMN IF NOT EXISTS active_count INT;

UPDATE managers SET 
    office_id = business_unit_id,
    active_count = current_load
WHERE office_id IS NULL OR active_count IS NULL;

-- 4. RR Pointer table
ALTER TABLE rr_pointer ADD COLUMN IF NOT EXISTS routing_bucket TEXT;
ALTER TABLE rr_pointer ADD COLUMN IF NOT EXISTS last_manager_id UUID;
ALTER TABLE rr_pointer ALTER COLUMN business_unit_id DROP NOT NULL;

-- Create unique index on routing_bucket for ON CONFLICT
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_rr_pointer_bucket') THEN
        CREATE UNIQUE INDEX idx_rr_pointer_bucket ON rr_pointer(routing_bucket);
    END IF;
END $$;

-- 5. Ticket Assignment table
ALTER TABLE ticket_assignment ADD COLUMN IF NOT EXISTS routing_bucket TEXT;
ALTER TABLE ticket_assignment ADD COLUMN IF NOT EXISTS office_id UUID;
ALTER TABLE ticket_assignment ALTER COLUMN business_unit_id DROP NOT NULL;

UPDATE ticket_assignment SET office_id = business_unit_id WHERE office_id IS NULL;
UPDATE ticket_assignment SET business_unit_id = office_id WHERE business_unit_id IS NULL;

-- Unique constraint on ticket_id for n8n ON CONFLICT (ticket_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assignment_ticket_unique') THEN
        CREATE UNIQUE INDEX idx_assignment_ticket_unique ON ticket_assignment(ticket_id);
    END IF;
END $$;

-- 6. Triggers for synchronization
-- Managers: Sync current_load and active_count
CREATE OR REPLACE FUNCTION sync_manager_load() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.active_count IS DISTINCT FROM OLD.active_count THEN
        NEW.current_load = NEW.active_count;
    ELSIF NEW.current_load IS DISTINCT FROM OLD.current_load THEN
        NEW.active_count = NEW.current_load;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_manager_load ON managers;
CREATE TRIGGER trg_sync_manager_load
BEFORE UPDATE ON managers
FOR EACH ROW EXECUTE FUNCTION sync_manager_load();

-- Tickets: Sync body/text, raw_address/address, client_segment/segment
CREATE OR REPLACE FUNCTION sync_ticket_fields() RETURNS TRIGGER AS $$
BEGIN
    -- Body <-> Text
    IF NEW.text IS DISTINCT FROM OLD.text THEN
        NEW.body = NEW.text;
    ELSIF NEW.body IS DISTINCT FROM OLD.body THEN
        NEW.text = NEW.body;
    END IF;
    
    -- Address <-> Raw Address
    IF NEW.address IS DISTINCT FROM OLD.address THEN
        NEW.raw_address = NEW.address;
    ELSIF NEW.raw_address IS DISTINCT FROM OLD.raw_address THEN
        NEW.address = NEW.raw_address;
    END IF;

    -- Segment <-> Client Segment
    IF NEW.segment IS DISTINCT FROM OLD.segment THEN
        NEW.client_segment = NEW.segment;
    ELSIF NEW.client_segment IS DISTINCT FROM OLD.client_segment THEN
        NEW.segment = NEW.client_segment;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ticket_fields ON tickets;
CREATE TRIGGER trg_sync_ticket_fields
BEFORE INSERT OR UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION sync_ticket_fields();

-- Ticket AI: Sync priority_1_10 / priority
CREATE OR REPLACE FUNCTION sync_ticket_ai_fields() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
        NEW.priority_1_10 = NEW.priority;
    ELSIF NEW.priority_1_10 IS DISTINCT FROM OLD.priority_1_10 THEN
        NEW.priority = NEW.priority_1_10;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ticket_ai_fields ON ticket_ai;
CREATE TRIGGER trg_sync_ticket_ai_fields
BEFORE INSERT OR UPDATE ON ticket_ai
FOR EACH ROW EXECUTE FUNCTION sync_ticket_ai_fields();

-- Ticket Assignment: Sync business_unit_id <-> office_id
CREATE OR REPLACE FUNCTION sync_assignment_fields() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.office_id IS DISTINCT FROM OLD.office_id THEN
        NEW.business_unit_id = NEW.office_id;
    ELSIF NEW.business_unit_id IS DISTINCT FROM OLD.business_unit_id THEN
        NEW.office_id = NEW.business_unit_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_assignment_fields ON ticket_assignment;
CREATE TRIGGER trg_sync_assignment_fields
BEFORE INSERT OR UPDATE ON ticket_assignment
FOR EACH ROW EXECUTE FUNCTION sync_assignment_fields();
