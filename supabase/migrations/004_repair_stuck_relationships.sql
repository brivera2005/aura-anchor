-- One-time data repair for couples stuck after invite accept (run in Supabase SQL editor).
-- Links user2 from accepted invites and activates relationships when both partners onboarded.

UPDATE relationships r
SET
  user2_id = p.user_id,
  status = 'active',
  updated_at = NOW()
FROM invites i
JOIN profiles p ON lower(p.email) = lower(i.to_email)
WHERE i.relationship_id = r.id
  AND i.status IN ('accepted', 'pending')
  AND r.status = 'pending'
  AND r.user2_id IS NULL
  AND p.onboarding_completed = TRUE;

UPDATE relationships
SET status = 'active', updated_at = NOW()
WHERE status = 'pending'
  AND user2_id IS NOT NULL;

UPDATE invites i
SET status = 'accepted'
FROM relationships r
WHERE i.relationship_id = r.id
  AND r.status = 'active'
  AND r.user2_id IS NOT NULL
  AND i.status = 'pending'
  AND lower(i.to_email) IN (
    SELECT lower(email) FROM profiles WHERE user_id = r.user2_id
  );
