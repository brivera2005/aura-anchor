SELECT r.id, r.status, r.user1_id, r.user2_id, r.type, r.created_at
FROM relationships r
ORDER BY r.created_at DESC
LIMIT 10;

SELECT i.id, i.status, i.to_email, i.relationship_id
FROM invites i
ORDER BY i.created_at DESC
LIMIT 10;

SELECT p.user_id, p.name, p.email, p.onboarding_completed
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;
