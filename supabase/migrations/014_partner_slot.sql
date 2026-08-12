-- One included partner email per paying subscriber (anti-abuse)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_slot_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_slot_user_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_slot_locked_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_slot_permanent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_slot_change_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS partner_slot_grace_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_partner_slot_email ON profiles(partner_slot_email);

COMMENT ON COLUMN profiles.partner_slot_email IS
  'Normalized lowercase email of the ONE person who may join free on this subscription';
COMMENT ON COLUMN profiles.partner_slot_user_id IS
  'Profile id of the partner who claimed the included slot';
COMMENT ON COLUMN profiles.partner_slot_locked_at IS
  'When partner_slot_email was permanently locked';
COMMENT ON COLUMN profiles.partner_slot_permanent IS
  'True after trial ends or grace period — no more email changes';
COMMENT ON COLUMN profiles.partner_slot_change_count IS
  'Number of partner email changes during trial/grace (max 5)';
COMMENT ON COLUMN profiles.partner_slot_grace_ends_at IS
  'End of editable window: trial end or 3-day grace for lifetime/direct monthly';
