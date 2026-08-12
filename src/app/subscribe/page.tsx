"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Anchor, Heart, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PartnerJoinsFreeCallout, PricingCards } from "@/components/pricing-cards";
import type { PlanId } from "@/lib/pricing";
import { PRICING } from "@/lib/pricing";

function SubscribeContent() {
 const searchParams = useSearchParams();
 const canceled = searchParams.get("canceled") === "1";
 const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
 const [error, setError] = useState<string | null>(null);

 async function startCheckout(plan: PlanId) {
 setLoadingPlan(plan);
 setError(null);

 try {
 const res = await fetch("/api/stripe/create-checkout-session", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ plan }),
 });
 const data = await res.json();
 if (!res.ok) {
 throw new Error(data.error || "Could not start checkout");
 }
 if (data.url) {
 window.location.href = data.url;
 return;
 }
 throw new Error("No checkout URL returned");
 } catch (err) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 setLoadingPlan(null);
 }
 }

 return (
 <AppShell>
 <div className="mx-auto max-w-6xl space-y-10 pb-12">
 <div className="text-center">
 <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
 <Heart className="h-7 w-7 text-primary" />
 </div>
 <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
 Choose your plan
 </h1>
 <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
 ${PRICING.monthly.price}/mo - partner joins free. Subscribe to start your healing loops.
 </p>
 </div>

 {canceled && (
 <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
 Checkout was canceled. Pick a plan whenever you&apos;re ready.
 </div>
 )}

 {error && (
 <div className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
 {error}
 </div>
 )}

 <PricingCards
 mode="subscribe"
 onCheckout={startCheckout}
 loadingPlan={loadingPlan}
 />

 <PartnerJoinsFreeCallout />

 <div className="text-center">
 <Link
 href="/settings"
 className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
 >
 <Anchor className="h-3 w-3" />
 Back to settings
 </Link>
 </div>
 </div>
 </AppShell>
 );
}

export default function SubscribePage() {
 return (
 <Suspense
 fallback={
 <div className="gradient-aura flex min-h-screen items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 }
 >
 <SubscribeContent />
 </Suspense>
 );
}
