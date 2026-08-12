-- Partners can read each other's onboarding responses within the same relationship.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'onboarding_responses'
      AND policyname = 'Partners can view relationship onboarding'
  ) THEN
    CREATE POLICY "Partners can view relationship onboarding" ON onboarding_responses FOR SELECT
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM relationships r
          WHERE r.status IN ('active', 'pending')
            AND r.id = onboarding_responses.relationship_id
            AND (r.user1_id = auth.uid() OR r.user2_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Deduplicate NULL relationship_id rows (Postgres treats NULLs as distinct in UNIQUE).
DELETE FROM onboarding_responses a
USING onboarding_responses b
WHERE a.relationship_id IS NULL
  AND b.relationship_id IS NULL
  AND a.user_id = b.user_id
  AND a.question_key = b.question_key
  AND a.created_at < b.created_at;

-- Drop orphan rows when a linked copy already exists.
DELETE FROM onboarding_responses o
WHERE o.relationship_id IS NULL
  AND EXISTS (
    SELECT 1 FROM onboarding_responses linked
    WHERE linked.user_id = o.user_id
      AND linked.relationship_id IS NOT NULL
      AND linked.question_key = o.question_key
  );

-- Link remaining orphans to the earliest active/pending relationship per couple.
UPDATE onboarding_responses o
SET relationship_id = rel.pick_id
FROM (
  SELECT DISTINCT ON (o2.id)
    o2.id AS orphan_id,
    r.id AS pick_id
  FROM onboarding_responses o2
  JOIN relationships r
    ON o2.user_id IN (r.user1_id, r.user2_id)
   AND r.status IN ('active', 'pending')
  WHERE o2.relationship_id IS NULL
  ORDER BY o2.id, r.created_at ASC
) rel
WHERE o.id = rel.orphan_id
  AND NOT EXISTS (
    SELECT 1 FROM onboarding_responses linked
    WHERE linked.user_id = o.user_id
      AND linked.relationship_id = rel.pick_id
      AND linked.question_key = o.question_key
  );

-- Clear empty-data analyses so couples can re-run after repair.
DELETE FROM relationship_insights
WHERE insight_type = 'onboarding_analysis'
  AND (
    content->>'summary' ILIKE '%no onboarding responses%'
    OR content->>'summary' ILIKE '%no responses were provided%'
    OR (
      (content->>'health_score')::int = 50
      AND content->>'summary' ILIKE '%without%responses%'
    )
  );
