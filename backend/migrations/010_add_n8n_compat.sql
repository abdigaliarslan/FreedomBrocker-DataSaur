-- Position column (text) for n8n compatibility
ALTER TABLE managers ADD COLUMN IF NOT EXISTS position TEXT;
UPDATE managers SET position = CASE
  WHEN is_chief_spec THEN 'Глав спец'
  ELSE 'Специалист'
END WHERE position IS NULL;

-- Skills column (jsonb) for n8n compatibility
ALTER TABLE managers ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
UPDATE managers SET skills = (
  SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
    SELECT 'VIP' AS s WHERE managers.is_vip_skill
    UNION ALL
    SELECT unnest(managers.languages)
  ) sub
) WHERE skills = '[]'::jsonb;
