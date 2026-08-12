import type Stripe from "stripe";

import { applyPartnerSlotFromCheckout } from "@/lib/partner-slot";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapStripeSubscriptionStatus } from "@/lib/stripe";

export async function updateProfileFromSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  customerId?: string | null,
  _options?: { previousStatus?: string | null }
) {
  const admin = createAdminClient();
  const periodEnd = subscription.items.data[0]?.current_period_end;

  await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId ?? (subscription.customer as string),
      stripe_subscription_id: subscription.id,
      subscription_status: mapStripeSubscriptionStatus(subscription.status),
      subscription_current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq("user_id", userId);
}

export async function initPartnerSlotAfterCheckout(
  userId: string,
  options: {
    subscriptionStatus: string;
    trialEnd?: number | null;
    partnerEmail?: string | null;
  }
) {
  await applyPartnerSlotFromCheckout(userId, options.partnerEmail);
}

export async function updateProfileLifetime(
  userId: string,
  customerId?: string | null,
  partnerEmail?: string | null
) {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId ?? undefined,
      stripe_subscription_id: null,
      subscription_status: "lifetime",
      subscription_current_period_end: null,
    })
    .eq("user_id", userId);

  await applyPartnerSlotFromCheckout(userId, partnerEmail);
}

export async function clearProfileSubscription(userId: string) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.subscription_status === "lifetime") {
    return;
  }

  await admin
    .from("profiles")
    .update({
      stripe_subscription_id: null,
      subscription_status: "canceled",
      subscription_current_period_end: null,
    })
    .eq("user_id", userId);
}

export async function findUserIdByStripeCustomer(
  customerId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function getProfileSubscriptionStatus(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.subscription_status ?? null;
}
