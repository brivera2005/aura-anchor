-- Per-partner cycle answer counters (each partner must complete 5 before cycle ends)

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS partner_answers_this_cycle JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill from answered questions in the current cycle when counters are empty
UPDATE relationships r
SET partner_answers_this_cycle = counts.per_partner
FROM (
  SELECT
    ua.relationship_id,
    jsonb_object_agg(ua.user_id::text, ua.cnt) AS per_partner
  FROM (
    SELECT
      aq.relationship_id,
      ua.user_id,
      COUNT(*)::int AS cnt
    FROM user_answers ua
    JOIN ai_questions aq ON aq.id = ua.question_id
    JOIN relationships rel ON rel.id = aq.relationship_id
    WHERE aq.status = 'answered'
      AND aq.cycle_number = rel.cycle_number
    GROUP BY aq.relationship_id, ua.user_id
  ) ua
  GROUP BY ua.relationship_id
) counts
WHERE r.id = counts.relationship_id
  AND (r.partner_answers_this_cycle = '{}'::jsonb OR r.partner_answers_this_cycle IS NULL);
