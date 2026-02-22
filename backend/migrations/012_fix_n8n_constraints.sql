-- Fix n8n compatibility: relax NOT NULL constraints and add sync triggers
-- n8n inserts via office_id but backend expects business_unit_id

-- 1. rr_pointer: business_unit_id is NOT NULL but n8n doesn't provide it
ALTER TABLE rr_pointer ALTER COLUMN business_unit_id DROP NOT NULL;

-- 2. ticket_assignment: same issue
ALTER TABLE ticket_assignment ALTER COLUMN business_unit_id DROP NOT NULL;

-- 3. Trigger: sync office_id <-> business_unit_id on ticket_assignment
CREATE OR REPLACE FUNCTION sync_assignment_fields() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.office_id IS NOT NULL AND NEW.business_unit_id IS NULL THEN
        NEW.business_unit_id = NEW.office_id;
    ELSIF NEW.business_unit_id IS NOT NULL AND NEW.office_id IS NULL THEN
        NEW.office_id = NEW.business_unit_id;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF NEW.office_id IS DISTINCT FROM OLD.office_id THEN
            NEW.business_unit_id = NEW.office_id;
        ELSIF NEW.business_unit_id IS DISTINCT FROM OLD.business_unit_id THEN
            NEW.office_id = NEW.business_unit_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_assignment_fields ON ticket_assignment;
CREATE TRIGGER trg_sync_assignment_fields
BEFORE INSERT OR UPDATE ON ticket_assignment
FOR EACH ROW EXECUTE FUNCTION sync_assignment_fields();

-- 4. Backfill existing records
UPDATE ticket_assignment SET office_id = business_unit_id WHERE office_id IS NULL AND business_unit_id IS NOT NULL;
UPDATE ticket_assignment SET business_unit_id = office_id WHERE business_unit_id IS NULL AND office_id IS NOT NULL;
