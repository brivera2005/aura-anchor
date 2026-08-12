import Link from "next/link";
import {
 Anchor,
 ArrowRight,
 BarChart3,
 Heart,
 Link2,
 Lock,
 MessageCircle,
 RefreshCw,
 Shield,
 Sparkles,
 Users,
} from "lucide-react";
import { LandingNav } from "@/components/app-shell";
import { PartnerJoinsFreeCallout, PricingCards } from "@/components/pricing-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_FEATURES, PRICING } from "@/lib/pricing";

export const dynamic = "force-static";

const features = [
 {
 icon: Users,
 title: "Every relationship that matters",
 description:
 "Spouse, parent, child, sibling, friend, or partner - each connection gets its own guided healing path.",
 },
 {
 icon: MessageCircle,
 title: "Guided dialogue",
 description:
 "Answer one thoughtful question at a time. Your guide translates your answers into briefings your partner can understand.",
 },
 {
 icon: Sparkles,
 title: "Perception insights",
 description:
 "Discover how you see each other versus how you see yourselves. Close the gaps with compassion.",
 },
 {
 icon: Lock,
 title: "Privacy first",
 description:
 "Your responses are encrypted before they reach our database. Your vulnerability stays protected.",
 },
];

const steps = [
 {
 icon: Link2,
 title: "Connect",
 text: "Add the people who matter - partner, parent, sibling, friend, and more.",
 },
 {
 icon: Heart,
 title: "Onboard",
 text: "Complete guided onboarding tailored to each relationship's unique dynamics.",
 },
 {
 icon: RefreshCw,
 title: "Cycles",
 text: "Move through healing cycles with reflection questions designed for real progress.",
 },
 {
 icon: BarChart3,
 title: "Reports",
 text: "Receive healing reports, perception insights, and partner briefings you can export.",
 },
];

export default function LandingPage() {
 const monthlyPrice = PRICING.monthly.price;

 return (
 <div className="dark landing-page min-h-screen">
 <div className="gradient-aura-landing relative min-h-screen overflow-hidden">
 <div className="landing-glow landing-glow-1" aria-hidden />
 <div className="landing-glow landing-glow-2" aria-hidden />

 <LandingNav />

 {/* Hero */}
 <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-32 text-center sm:pt-36">
 <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-sm text-primary">
 <Heart className="h-4 w-4 animate-pulse-soft" />
 Guided relationship healing
 </div>
 <h1 className="animate-fade-up font-serif mx-auto max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
 Understand each other.
 <br />
 <span className="bg-gradient-to-r from-primary via-rose-300 to-teal-300 bg-clip-text text-transparent">
 Heal together.
 </span>
 </h1>
 <p className="animate-fade-up-delay mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
 Aura & Anchor helps people bridge perception gaps in the relationships
 that matter - through guided reflection, personalized insights, and
 compassionate briefings built for real life.
 </p>
 <div className="animate-fade-up-delay mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
 <Button size="lg" className="min-w-[220px] shadow-lg shadow-primary/20" asChild>
 <Link href={`/login?redirect=${encodeURIComponent("/subscribe?plan=monthly")}`}>
 Get started
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 <Button size="lg" variant="outline" className="min-w-[160px]" asChild>
 <Link href="#pricing">View pricing</Link>
 </Button>
 </div>
 <p className="animate-fade-up-delay mt-6 text-sm text-muted-foreground">
 ${monthlyPrice}/mo - partner joins free · Cancel anytime
 </p>
 </section>

 {/* Social proof */}
 <section className="relative mx-auto max-w-6xl px-4 pb-20">
 <div className="landing-social-proof mx-auto max-w-3xl rounded-2xl border border-border/50 px-6 py-5 text-center">
 <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
 Built for real relationships
 </p>
 <p className="mt-2 font-serif text-lg text-foreground/90 sm:text-xl">
 &ldquo;Finally, a space that meets us where we are - not where a textbook
 says we should be.&rdquo;
 </p>
 <p className="mt-3 text-sm text-muted-foreground"> - Couples, families & friends healing together
 </p>
 </div>
 </section>

 {/* Features */}
 <section className="relative mx-auto max-w-6xl px-4 py-16">
 <div className="mb-12 text-center">
 <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
 Everything you need to heal
 </h2>
 <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
 Proprietary guided healing - no generic advice, no cold questionnaires.
 </p>
 </div>
 <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
 {features.map(({ icon: Icon, title, description }) => (
 <Card key={title} className="landing-card border-0 shadow-none">
 <CardHeader>
 <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
 <Icon className="h-5 w-5 text-primary" />
 </div>
 <CardTitle className="text-lg">{title}</CardTitle>
 </CardHeader>
 <CardContent>
 <CardDescription className="text-base leading-relaxed">
 {description}
 </CardDescription>
 </CardContent>
 </Card>
 ))}
 </div>
 </section>

 {/* How it works */}
 <section id="how-it-works" className="relative mx-auto max-w-6xl px-4 py-16">
 <h2 className="font-serif mb-4 text-center text-3xl font-semibold sm:text-4xl">
 How it works
 </h2>
 <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
 Four steps from connection to clarity
 </p>
 <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
 {steps.map(({ icon: Icon, title, text }, i) => (
 <div key={title} className="landing-step group text-center">
 <div className="relative mx-auto mb-4">
 <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-teal-400/10 transition-transform duration-300 group-hover:scale-105">
 <Icon className="h-7 w-7 text-primary" />
 </div>
 <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
 {i + 1}
 </span>
 </div>
 <h3 className="mb-2 text-lg font-semibold">{title}</h3>
 <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
 </div>
 ))}
 </div>
 </section>

 {/* Pricing */}
 <section id="pricing" className="relative mx-auto max-w-6xl px-4 py-20">
 <div className="mb-12 text-center">
 <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
 Simple, honest pricing
 </h2>
 <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
 ${monthlyPrice}/mo - partner joins free. One subscriber covers both
 partners - your invitee joins at no extra cost.
 </p>
 </div>

 <PricingCards mode="landing" />

 <div className="mt-10">
 <PartnerJoinsFreeCallout />
 </div>

 <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2">
 {PLAN_FEATURES.map((feature) => (
 <li key={feature} className="flex items-center gap-1.5 text-sm text-muted-foreground">
 <Sparkles className="h-3.5 w-3.5 text-primary" />
 {feature}
 </li>
 ))}
 </ul>
 </section>

 {/* Final CTA */}
 <section className="relative mx-auto max-w-6xl px-4 py-16">
 <Card className="landing-cta overflow-hidden border-0">
 <CardContent className="flex flex-col items-center p-10 text-center md:p-16">
 <Anchor className="mb-4 h-10 w-10 text-primary" />
 <h2 className="font-serif mb-4 text-3xl font-semibold sm:text-4xl">
 Ready to strengthen your connections?
 </h2>
 <p className="mb-8 max-w-lg text-muted-foreground">
 Start with one relationship - add as many as you need. Each gets
 its own healing journey.
 </p>
 <Button size="lg" className="shadow-lg shadow-primary/20" asChild>
 <Link href={`/login?redirect=${encodeURIComponent("/subscribe?plan=monthly")}`}>
 <Shield className="h-4 w-4" />
 Subscribe - ${monthlyPrice}/mo
 </Link>
 </Button>
 </CardContent>
 </Card>
 </section>

 {/* Footer */}
 <footer className="relative border-t border-border/40 py-12">
 <div className="mx-auto max-w-6xl px-4">
 <div className="flex flex-col items-center gap-6 text-center">
 <div className="flex items-center gap-2">
 <Anchor className="h-5 w-5 text-primary" />
 <span className="font-serif text-lg font-semibold">Aura & Anchor</span>
 </div>
 <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
 <span className="flex items-center gap-1.5">
 <Lock className="h-3.5 w-3.5" />
 Privacy-first
 </span>
 <span className="flex items-center gap-1.5">
 <Shield className="h-3.5 w-3.5" />
 End-to-end encrypted responses
 </span>
 </div>
 <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
 Aura & Anchor is a guided relationship tool, not therapy or medical
 advice. If you are in crisis, please contact a licensed professional
 or local emergency services.
 </p>
 <p className="text-xs text-muted-foreground">
 © {new Date().getFullYear()} Aura & Anchor. All rights reserved.
 </p>
 </div>
 </div>
 </footer>
 </div>
 </div>
 );
}
