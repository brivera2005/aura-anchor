import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin";
import { getPartnerSlotState } from "@/lib/partner-slot";
import { userHasSubscriptionAccess } from "@/lib/subscription";
import { isActiveSubscriptionStatus, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "subscription_status, subscription_current_period_end, stripe_customer_id"
    )
    .eq("user_id", user.id)
    .single();

  const ownActive = isActiveSubscriptionStatus(profile?.subscription_status);
  const hasAccess = await userHasSubscriptionAccess(
    supabase,
    user.id,
    user.email
  );
  const isAdmin = isAdminEmail(user.email);
  const partnerSlot = await getPartnerSlotState(user.id);

  return NextResponse.json({
    configured: isStripeConfigured(),
    hasAccess,
    isAdmin,
    ownSubscriptionActive: ownActive,
    partnerHasSubscription: hasAccess && !ownActive,
    subscriptionStatus: profile?.subscription_status ?? "none",
    currentPeriodEnd: profile?.subscription_current_period_end ?? null,
    hasBillingAccount: !!profile?.stripe_customer_id,
    partnerSlot: partnerSlot
      ? {
          email: partnerSlot.email,
          locked: partnerSlot.locked,
          lockedAt: partnerSlot.lockedAt,
          claimedUserId: partnerSlot.partnerUserId,
          canEdit: partnerSlot.canEdit,
        }
      : null,
  });
}
