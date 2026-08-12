"use client";

import Link from "next/link";
import { useState } from "react";
import {
 Check,
 Crown,
 Loader2,
 Sparkles,
 Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from "@/components/ui/card";
import {
 PLAN_FEATURES,
 PRICING,
 type PlanId,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

type PricingCardsProps = {
 mode: "landing" | "subscribe";
 onCheckout?: (plan: PlanId) => void;
 loadingPlan?: PlanId | null;
};

const planMeta: Record<
 PlanId,
 {
 icon: typeof Sparkles;
 highlight?: boolean;
 badge?: string;
 description: string;
 cta: string;
 }
> = {
 monthly: {
 icon: Sparkles,
 description: "Cancel anytime · Partner joins free",
 cta: "Subscribe - $14.99/mo",
 },
 lifetime: {
 icon: Crown,
 highlight: true,
 badge: PRICING.lifetime.badge,
 description: "Pay once · Forever access · All future features",
 cta: "Get lifetime access",
 },
 annual: {
 icon: Zap,
 badge: PRICING.annual.savings,
 description: "Billed yearly · Partner joins free · Best for committed healing",
 cta: "Start annual plan",
 },
};

function loginHref(plan: PlanId) {
 return `/login?redirect=${encodeURIComponent(`/subscribe?plan=${plan}`)}`;
}

export function PricingCards({ mode, onCheckout, loadingPlan }: PricingCardsProps) {
 const plans: PlanId[] = ["monthly", "lifetime", "annual"];

 return (
 <div className="grid gap-6 lg:grid-cols-3">
 {plans.map((planId) => {
 const pricing = PRICING[planId];
 const meta = planMeta[planId];
 const Icon = meta.icon;
 const isLoading = loadingPlan === planId;

 return (
 <Card
 key={planId}
 className={cn(
 "landing-pricing-card relative flex flex-col overflow-hidden border-border/60 transition-all duration-300",
 meta.highlight &&
 "border-primary/40 shadow-lg shadow-primary/10 lg:scale-[1.02]"
 )}
 >
 {meta.badge && (
 <div className="absolute right-4 top-4">
 <Badge
 variant={meta.highlight ? "default" : "secondary"}
 className="text-xs"
 >
 {meta.badge}
 </Badge>
 </div>
 )}
 <CardHeader className="pb-2 pt-8">
 <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
 <Icon className="h-5 w-5 text-primary" />
 </div>
 <CardTitle className="font-serif text-xl">{pricing.label}</CardTitle>
 <CardDescription className="text-sm leading-relaxed">
 {meta.description}
 </CardDescription>
 <div className="mt-4 flex items-baseline gap-1">
 <span className="font-serif text-4xl font-semibold tracking-tight">
 ${pricing.price}
 </span>
 <span className="text-sm text-muted-foreground">{pricing.period}</span>
 </div>
 </CardHeader>
 <CardContent className="flex-1 pb-6">
 <ul className="mb-6 space-y-2.5">
 {PLAN_FEATURES.map((feature) => (
 <li key={feature} className="flex items-start gap-2 text-sm">
 <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <span className="text-muted-foreground">{feature}</span>
 </li>
 ))}
 </ul>
 {mode === "landing" ? (
 <Button
 className="w-full"
 size="lg"
 variant={meta.highlight ? "default" : "outline"}
 asChild
 >
 <Link href={loginHref(planId)}>
 {planId === "monthly" ? "Get started" : meta.cta}
 </Link>
 </Button>
 ) : (
 <Button
 className="w-full"
 size="lg"
 variant={meta.highlight ? "default" : "outline"}
 onClick={() => onCheckout?.(planId)}
 disabled={!!loadingPlan}
 >
 {isLoading ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 meta.cta
 )}
 </Button>
 )}
 </CardContent>
 </Card>
 );
 })}
 </div>
 );
}

export function PartnerJoinsFreeCallout() {
 return (
 <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-center text-sm">
 <Sparkles className="h-4 w-4 shrink-0 text-primary" />
 <p>
 <span className="font-medium text-foreground">One partner joins free.</span>{" "}
 Set their email during onboarding - it locks permanently on confirm.
 </p>
 </div>
 );
}
