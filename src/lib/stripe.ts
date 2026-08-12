import Stripe from "stripe";

import { getAppUrl, getRequiredEnv } from "@/lib/env";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "lifetime"
  | "canceled"
  | "past_due"
  | "none";

export type CheckoutPlan = "monthly" | "lifetime" | "annual";

export function isStripeConfigured(): boolean {
  return !!(
    getRequiredEnv("STRIPE_SECRET_KEY") &&
    getRequiredEnv("STRIPE_PRICE_ID") &&
    getRequiredEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
  );
}

export function getStripeSecretKey(): string | null {
  return getRequiredEnv("STRIPE_SECRET_KEY");
}

export function getStripePriceId(): string | null {
  return getRequiredEnv("STRIPE_PRICE_ID");
}

export function getStripeLifetimePriceId(): string | null {
  return getRequiredEnv("STRIPE_LIFETIME_PRICE_ID");
}

export function getStripeAnnualPriceId(): string | null {
  return getRequiredEnv("STRIPE_ANNUAL_PRICE_ID");
}

export function getStripeWebhookSecret(): string | null {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripeTrialDays(): number {
  const raw = process.env.STRIPE_TRIAL_DAYS?.trim();
  if (!raw) return 0;
  const days = parseInt(raw, 10);
  return Number.isFinite(days) && days > 0 ? days : 0;
}

export function getDisplayPrice(): string {
  return process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE?.trim() || "14.99";
}

export function resolvePriceIdForPlan(plan: CheckoutPlan): string | null {
  switch (plan) {
    case "monthly":
      return getStripePriceId();
    case "lifetime":
      return getStripeLifetimePriceId();
    case "annual":
      return getStripeAnnualPriceId();
  }
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function isActiveSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "lifetime"
  );
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status | null | undefined
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

export function getCheckoutUrls(plan?: CheckoutPlan) {
  const appUrl = getAppUrl();
  const planParam = plan && plan !== "monthly" ? `&plan=${plan}` : "";
  return {
    successUrl: `${appUrl}/dashboard?subscribed=1`,
    cancelUrl: `${appUrl}/subscribe?canceled=1${planParam}`,
  };
}

export function getPortalReturnUrl() {
  return `${getAppUrl()}/settings`;
}
