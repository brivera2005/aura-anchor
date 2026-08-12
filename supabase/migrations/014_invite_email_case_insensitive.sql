-- Case-insensitive invite email matching for SELECT/UPDATE.
-- Without this, recipients whose Google email casing differs from the invite
-- cannot see or accept the invite (looks like "Invalid or expired invite").

DROP POLICY IF EXISTS "Users can view invites to their email" ON invites;
CREATE POLICY "Users can view invites to their email" ON invites FOR SELECT
  USING (
    lower(to_email) = lower((SELECT email FROM profiles WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own invites" ON invites;
CREATE POLICY "Users can update own invites" ON invites FOR UPDATE
  USING (
    auth.uid() = from_user_id
    OR lower(to_email) = lower((SELECT email FROM profiles WHERE user_id = auth.uid()))
  );
