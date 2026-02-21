-- Migration 014: Sync managers n8n-compatible columns on INSERT (not just UPDATE)
-- Fixes: after CSV import, office_id/active_count/position/skills remain NULL
-- causing n8n "Assign manager" CTE to find 0 eligible managers.

CREATE OR REPLACE FUNCTION sync_manager_fields() RETURNS TRIGGER AS $$
BEGIN
    -- office_id ↔ business_unit_id
    IF TG_OP = 'INSERT' THEN
        IF NEW.office_id IS NULL AND NEW.business_unit_id IS NOT NULL THEN
            NEW.office_id = NEW.business_unit_id;
        ELSIF NEW.business_unit_id IS NULL AND NEW.office_id IS NOT NULL THEN
            NEW.business_unit_id = NEW.office_id;
        END IF;
        -- active_count ↔ current_load
        IF NEW.active_count IS NULL AND NEW.current_load IS NOT NULL THEN
            NEW.active_count = NEW.current_load;
        ELSIF NEW.current_load IS NULL AND NEW.active_count IS NOT NULL THEN
            NEW.current_load = NEW.active_count;
        END IF;
        -- position from is_chief_spec
        IF NEW.position IS NULL THEN
            NEW.position = CASE WHEN NEW.is_chief_spec THEN 'Глав спец' ELSE 'Специалист' END;
        END IF;
        -- skills from is_vip_skill + languages
        IF NEW.skills IS NULL OR NEW.skills = '[]'::jsonb THEN
            NEW.skills = (
                SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
                    SELECT 'VIP' AS s WHERE NEW.is_vip_skill
                    UNION ALL
                    SELECT unnest(NEW.languages)
                ) sub
            );
        END IF;
    ELSE -- UPDATE
        IF NEW.office_id IS DISTINCT FROM OLD.office_id THEN
            NEW.business_unit_id = NEW.office_id;
        ELSIF NEW.business_unit_id IS DISTINCT FROM OLD.business_unit_id THEN
            NEW.office_id = NEW.business_unit_id;
        END IF;
        IF NEW.active_count IS DISTINCT FROM OLD.active_count THEN
            NEW.current_load = NEW.active_count;
        ELSIF NEW.current_load IS DISTINCT FROM OLD.current_load THEN
            NEW.active_count = NEW.current_load;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace old trigger with new comprehensive one
DROP TRIGGER IF EXISTS trg_sync_manager_load ON managers;
DROP TRIGGER IF EXISTS trg_sync_manager_fields ON managers;
CREATE TRIGGER trg_sync_manager_fields
BEFORE INSERT OR UPDATE ON managers
FOR EACH ROW EXECUTE FUNCTION sync_manager_fields();

-- Backfill existing records that have NULL n8n columns
UPDATE managers SET
    office_id = business_unit_id,
    active_count = current_load,
    position = CASE WHEN is_chief_spec THEN 'Глав спец' ELSE 'Специалист' END,
    skills = (
        SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
            SELECT 'VIP' AS s WHERE managers.is_vip_skill
            UNION ALL
            SELECT unnest(managers.languages)
        ) sub
    )
WHERE office_id IS NULL OR active_count IS NULL OR position IS NULL;
