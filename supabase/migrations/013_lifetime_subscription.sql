-- Lifetime subscribers use subscription_status = 'lifetime' (no schema change required).
-- Run manually to grandfather a user if needed:
-- UPDATE profiles SET subscription_status = 'lifetime' WHERE email = 'owner@example.com';

COMMENT ON COLUMN profiles.subscription_status IS
  'Stripe status: active, trialing, canceled, past_due, none — or lifetime for one-time purchasers';
