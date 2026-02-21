-- Migration 013: Complete sync triggers for ticket_ai
-- n8n writes: recommendation, confidence, priority, geo_country, updated_at
-- Backend reads: recommended_actions, confidence_type/sentiment/priority, priority_1_10
-- This trigger keeps both column sets in sync bidirectionally.

CREATE OR REPLACE FUNCTION sync_ticket_ai_fields() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- priority ↔ priority_1_10
        IF NEW.priority IS NOT NULL AND NEW.priority_1_10 IS NULL THEN
            NEW.priority_1_10 = NEW.priority;
        ELSIF NEW.priority_1_10 IS NOT NULL AND NEW.priority IS NULL THEN
            NEW.priority = NEW.priority_1_10;
        END IF;

        -- recommendation (text) ↔ recommended_actions (jsonb)
        IF NEW.recommendation IS NOT NULL AND (NEW.recommended_actions IS NULL OR NEW.recommended_actions = '[]'::jsonb) THEN
            NEW.recommended_actions = to_jsonb(ARRAY[NEW.recommendation]);
        ELSIF NEW.recommended_actions IS NOT NULL AND NEW.recommended_actions != '[]'::jsonb AND NEW.recommendation IS NULL THEN
            NEW.recommendation = NEW.recommended_actions->>0;
        END IF;

        -- confidence (single) ↔ confidence_type/sentiment/priority
        IF NEW.confidence IS NOT NULL THEN
            IF NEW.confidence_type IS NULL THEN NEW.confidence_type = NEW.confidence; END IF;
            IF NEW.confidence_sentiment IS NULL THEN NEW.confidence_sentiment = NEW.confidence; END IF;
            IF NEW.confidence_priority IS NULL THEN NEW.confidence_priority = NEW.confidence; END IF;
        ELSIF NEW.confidence_type IS NOT NULL AND NEW.confidence IS NULL THEN
            NEW.confidence = NEW.confidence_type;
        END IF;

    ELSE -- UPDATE
        -- priority ↔ priority_1_10
        IF NEW.priority IS DISTINCT FROM OLD.priority THEN
            NEW.priority_1_10 = NEW.priority;
        ELSIF NEW.priority_1_10 IS DISTINCT FROM OLD.priority_1_10 THEN
            NEW.priority = NEW.priority_1_10;
        END IF;

        -- recommendation ↔ recommended_actions
        IF NEW.recommendation IS DISTINCT FROM OLD.recommendation THEN
            NEW.recommended_actions = to_jsonb(ARRAY[NEW.recommendation]);
        ELSIF NEW.recommended_actions IS DISTINCT FROM OLD.recommended_actions THEN
            NEW.recommendation = NEW.recommended_actions->>0;
        END IF;

        -- confidence ↔ confidence_type/sentiment/priority
        IF NEW.confidence IS DISTINCT FROM OLD.confidence THEN
            NEW.confidence_type = NEW.confidence;
            NEW.confidence_sentiment = NEW.confidence;
            NEW.confidence_priority = NEW.confidence;
        ELSIF NEW.confidence_type IS DISTINCT FROM OLD.confidence_type THEN
            NEW.confidence = NEW.confidence_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger (replaces the one from migration 011)
DROP TRIGGER IF EXISTS trg_sync_ticket_ai_fields ON ticket_ai;
CREATE TRIGGER trg_sync_ticket_ai_fields
BEFORE INSERT OR UPDATE ON ticket_ai
FOR EACH ROW EXECUTE FUNCTION sync_ticket_ai_fields();

-- Backfill: recommendation → recommended_actions
UPDATE ticket_ai SET
    recommended_actions = to_jsonb(ARRAY[recommendation])
WHERE recommendation IS NOT NULL
  AND (recommended_actions IS NULL OR recommended_actions = '[]'::jsonb);

-- Backfill: recommended_actions → recommendation
UPDATE ticket_ai SET
    recommendation = recommended_actions->>0
WHERE recommendation IS NULL
  AND recommended_actions IS NOT NULL
  AND recommended_actions != '[]'::jsonb;

-- Backfill: confidence → confidence_type/sentiment/priority
UPDATE ticket_ai SET
    confidence_type = confidence,
    confidence_sentiment = confidence,
    confidence_priority = confidence
WHERE confidence IS NOT NULL AND confidence_type IS NULL;

-- Backfill: confidence_type → confidence
UPDATE ticket_ai SET confidence = confidence_type
WHERE confidence IS NULL AND confidence_type IS NOT NULL;

-- Backfill: priority ↔ priority_1_10
UPDATE ticket_ai SET priority_1_10 = priority
WHERE priority IS NOT NULL AND priority_1_10 IS NULL;

UPDATE ticket_ai SET priority = priority_1_10
WHERE priority IS NULL AND priority_1_10 IS NOT NULL;
