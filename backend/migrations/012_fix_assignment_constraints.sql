-- Migration 012: Fix Ticket Assignment Constraints
-- This migration ensures that the unique constraint idx_assignment_active exists
-- and that all existing assignments are consistent with it.

-- 1. Ensure any historical duplicates are marked as not current (shouldn't happen with the index, but good for safety)
WITH LatestAssignments AS (
    SELECT id, 
           ROW_NUMBER() OVER(PARTITION BY ticket_id ORDER BY assigned_at DESC) as rn
    FROM ticket_assignment
    WHERE is_current = true
)
UPDATE ticket_assignment
SET is_current = false
WHERE id IN (SELECT id FROM LatestAssignments WHERE rn > 1);

-- 2. Make sure the unique index exists (005_create_ticket_assignment.sql should have created it, but 011 added columns)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assignment_active') THEN
        CREATE UNIQUE INDEX idx_assignment_active ON ticket_assignment(ticket_id) WHERE is_current = true;
    END IF;
END $$;
