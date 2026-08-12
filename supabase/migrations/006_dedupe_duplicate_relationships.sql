-- End duplicate active relationships for the same couple; keep the one with onboarding data.
WITH ranked AS (
  SELECT
    r.id,
    r.user1_id,
    r.user2_id,
    r.created_at,
    COUNT(o.id) AS onboarding_count,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(r.user1_id, r.user2_id), GREATEST(r.user1_id, r.user2_id)
      ORDER BY COUNT(o.id) DESC, r.created_at ASC
    ) AS rn
  FROM relationships r
  LEFT JOIN onboarding_responses o ON o.relationship_id = r.id
  WHERE r.status IN ('active', 'pending')
    AND r.user2_id IS NOT NULL
  GROUP BY r.id, r.user1_id, r.user2_id, r.created_at
)
UPDATE relationships
SET status = 'ended', updated_at = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
