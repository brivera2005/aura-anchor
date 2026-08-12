import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin";
import {
  normalizePartnerEmail,
  partnerEmailGetsFreeAccess,
  type PartnerSlotProfile,
} from "@/lib/partner-slot";
import {
  isActiveSubscriptionStatus,
  isStripeConfigured,
} from "@/lib/stripe";

/** Subscriber pays; exactly ONE linked partner email gets access for free. */
export async function userHasSubscriptionAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null
): Promise<boolean> {
  if (!isStripeConfigured()) {
    return true;
  }

  if (userEmail && isAdminEmail(userEmail)) {
    return true;
  }

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("subscription_status, email")
    .eq("user_id", userId)
    .single();

  if (isAdminEmail(ownProfile?.email)) {
    return true;
  }

  if (isActiveSubscriptionStatus(ownProfile?.subscription_status)) {
    return true;
  }

  return userHasIncludedPartnerAccess(supabase, userId, userEmail);
}

async function userHasIncludedPartnerAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null
): Promise<boolean> {
  const normalizedEmail = userEmail ? normalizePartnerEmail(userEmail) : null;
  if (!normalizedEmail) return false;

  const { data: relationships } = await supabase
    .from("relationships")
    .select("user1_id, user2_id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .neq("status", "ended");

  if (!relationships?.length) {
    return false;
  }

  const subscriberIds = new Set<string>();
  for (const rel of relationships) {
    const otherUserId =
      rel.user1_id === userId ? rel.user2_id : rel.user1_id;
    if (otherUserId) subscriberIds.add(otherUserId);
  }

  if (!subscriberIds.size) {
    return false;
  }

  const { data: subscriberProfiles } = await supabase
    .from("profiles")
    .select(
      "user_id, subscription_status, email, partner_slot_email, partner_slot_user_id, partner_slot_locked_at, partner_slot_permanent, partner_slot_change_count, partner_slot_grace_ends_at, subscription_current_period_end"
    )
    .in("user_id", [...subscriberIds]);

  const { data: ownProfileRow } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const ownProfileId = ownProfileRow?.id ?? null;

  return (subscriberProfiles ?? []).some((profile) => {
    if (
      !isActiveSubscriptionStatus(profile.subscription_status) &&
      !isAdminEmail(profile.email)
    ) {
      return false;
    }

    return partnerEmailGetsFreeAccess(
      profile as PartnerSlotProfile,
      normalizedEmail,
      ownProfileId
    );
  });
}

export function formatSubscriptionStatus(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Free trial";
    case "lifetime":
      return "Lifetime";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    default:
      return "None";
  }
}
