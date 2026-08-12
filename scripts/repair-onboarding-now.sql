-- Deduplicate NULL relationship_id rows (Postgres treats NULLs as distinct in UNIQUE).
DELETE FROM onboarding_responses a
USING onboarding_responses b
WHERE a.relationship_id IS NULL
  AND b.relationship_id IS NULL
  AND a.user_id = b.user_id
  AND a.question_key = b.question_key
  AND a.created_at < b.created_at;
