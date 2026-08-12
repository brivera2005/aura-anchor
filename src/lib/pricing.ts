export type PlanId = "monthly" | "lifetime" | "annual";

export const PRICING = {
  monthly: {
    id: "monthly" as const,
    label: "Monthly",
    price: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE?.trim() || "14.99",
    period: "/month",
    trialDays: parseInt(
      process.env.NEXT_PUBLIC_STRIPE_TRIAL_DAYS?.trim() || "0",
      10
    ),
  },
  lifetime: {
    id: "lifetime" as const,
    label: "Lifetime",
    price: process.env.NEXT_PUBLIC_LIFETIME_PRICE?.trim() || "449",
    period: " one-time",
    badge: "Best value",
  },
  annual: {
    id: "annual" as const,
    label: "Annual",
    price: process.env.NEXT_PUBLIC_ANNUAL_PRICE?.trim() || "119",
    period: "/year",
    savings: "2 months free",
  },
} as const;

export const PLAN_FEATURES = [
  "Unlimited healing cycles",
  "Personalized healing reports",
  "Multi-relationship support",
  "Partner briefings",
  "Export reports as PDF",
] as const;

export function getTrialDays(): number {
  const raw = process.env.NEXT_PUBLIC_STRIPE_TRIAL_DAYS?.trim() || "0";
  const days = parseInt(raw, 10);
  return Number.isFinite(days) && days > 0 ? days : 0;
}

export function hasTrial(): boolean {
  return getTrialDays() > 0;
}
