import { NextResponse } from "next/server";

import {
  getCheckoutUrls,
  getStripe,
  isStripeConfigured,
  resolvePriceIdForPlan,
  type CheckoutPlan,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const VALID_PLANS: CheckoutPlan[] = ["monthly", "lifetime", "annual"];

function parsePlan(body: unknown): CheckoutPlan {
  if (
    body &&
    typeof body === "object" &&
    "plan" in body &&
    typeof (body as { plan: unknown }).plan === "string" &&
    VALID_PLANS.includes((body as { plan: string }).plan as CheckoutPlan)
  ) {
    return (body as { plan: CheckoutPlan }).plan;
  }
  return "monthly";
}

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured on this deployment" },
        { status: 503 }
      );
    }

    let plan: CheckoutPlan = "monthly";
    let partnerEmail: string | null = null;
    try {
      const body = await request.json();
      plan = parsePlan(body);
      if (
        body &&
        typeof body === "object" &&
        "partnerEmail" in body &&
        typeof (body as { partnerEmail: unknown }).partnerEmail === "string"
      ) {
        partnerEmail = (body as { partnerEmail: string }).partnerEmail.trim() || null;
      }
    } catch {
      plan = "monthly";
    }

    const priceId = resolvePriceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: `Plan "${plan}" is not configured on this deployment` },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, name, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profile?.subscription_status === "lifetime") {
      return NextResponse.json(
        { error: "You already have lifetime access" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const { successUrl, cancelUrl } = getCheckoutUrls(plan);

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || undefined,
        name: profile?.name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const checkoutMetadata: Record<string, string> = {
      user_id: user.id,
      plan,
    };
    if (partnerEmail) {
      checkoutMetadata.partner_email = partnerEmail.toLowerCase();
    }

    if (plan === "lifetime") {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        client_reference_id: user.id,
        metadata: checkoutMetadata,
      });

      return NextResponse.json({ url: session.url });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: checkoutMetadata,
      subscription_data: {
        metadata: checkoutMetadata,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isStripeConfigured(),
  });
}
