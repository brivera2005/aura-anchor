import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  clearProfileSubscription,
  findUserIdByStripeCustomer,
  getProfileSubscriptionStatus,
  initPartnerSlotAfterCheckout,
  updateProfileFromSubscription,
  updateProfileLifetime,
} from "@/lib/stripe-profile";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.metadata?.user_id || session.client_reference_id || null;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const plan = session.metadata?.plan;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        if (!userId) break;

        const partnerEmail = session.metadata?.partner_email ?? null;

        if (
          session.mode === "payment" ||
          plan === "lifetime"
        ) {
          await updateProfileLifetime(userId, customerId, partnerEmail);
          break;
        }

        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(
            subscriptionId
          );
          await updateProfileFromSubscription(userId, subscription, customerId);
          await initPartnerSlotAfterCheckout(userId, {
            subscriptionStatus:
              subscription.status === "trialing" ? "trialing" : "active",
            trialEnd: subscription.trial_end,
            partnerEmail,
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const customerId =
          typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : null;

        if (!customerId) break;

        const userId = await findUserIdByStripeCustomer(customerId);
        if (!userId) break;

        const status = await getProfileSubscriptionStatus(userId);
        if (status === "lifetime") break;

        const sessions = await getStripe().checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1,
        });
        const session = sessions.data[0];
        if (
          session?.mode === "payment" ||
          session?.metadata?.plan === "lifetime"
        ) {
          await updateProfileLifetime(
            userId,
            customerId,
            session.metadata?.partner_email ?? null
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId: string | null = subscription.metadata?.user_id ?? null;

        if (!userId) {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id;
          if (customerId) {
            userId = await findUserIdByStripeCustomer(customerId);
          }
        }

        if (!userId) break;

        const currentStatus = await getProfileSubscriptionStatus(userId);
        if (currentStatus === "lifetime") break;

        if (
          event.type === "customer.subscription.deleted" ||
          subscription.status === "canceled"
        ) {
          await clearProfileSubscription(userId);
        } else {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : null;
          await updateProfileFromSubscription(userId, subscription, customerId, {
            previousStatus: currentStatus,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`stripe webhook handler error (${event.type}):`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
