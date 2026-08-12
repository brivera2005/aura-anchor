"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { AnswerInput } from "@/components/answer-input";
import { AppShell } from "@/components/app-shell";
import { QuickAnswerChips } from "@/components/quick-answer-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { buildOnboardingSteps, HELP_AREAS } from "@/lib/constants";
import { getQuickAnswersForField } from "@/lib/quick-answers";
import { writeSelectedRelationshipId } from "@/lib/selected-relationship-storage";
import type { RelationshipType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PARTNER_STEP = {
 id: "partner_slot",
 title: "Your included partner (1 free)",
 description:
 "Choose the Google account email your partner will use to sign in. This is permanent.",
 fields: [] as { key: string; label: string; type: string }[],
};

function OnboardingContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const relationshipIdParam = searchParams.get("relationship");

 const [step, setStep] = useState(0);
 const [responses, setResponses] = useState<Record<string, string | string[]>>({});
 const [saving, setSaving] = useState(false);
 const [relationshipId, setRelationshipId] = useState<string | null>(relationshipIdParam);
 const [relationshipType, setRelationshipType] = useState<RelationshipType>("partner");
 const [connectionName, setConnectionName] = useState<string | null>(null);
 const [loadingMeta, setLoadingMeta] = useState(true);
 const [metaError, setMetaError] = useState<string | null>(null);

 const [partnerEmail, setPartnerEmail] = useState("");
 const [partnerName, setPartnerName] = useState("");
 const [partnerSlotLocked, setPartnerSlotLocked] = useState(false);
 const [lockedPartnerEmail, setLockedPartnerEmail] = useState<string | null>(null);
 const [permanentAcknowledged, setPermanentAcknowledged] = useState(false);
 const [partnerError, setPartnerError] = useState<string | null>(null);

 const onboardingSteps = useMemo(() => {
 const base = buildOnboardingSteps(relationshipType);
 const demoIdx = base.findIndex((s) => s.id === "demographics");
 const insertAt = demoIdx >= 0 ? demoIdx + 1 : 1;
 const steps = [...base];
 steps.splice(insertAt, 0, PARTNER_STEP);
 return steps;
 }, [relationshipType]);

 const currentStep = onboardingSteps[step];
 const progress = ((step + 1) / onboardingSteps.length) * 100;
 const isPartnerStep = currentStep?.id === "partner_slot";

 useEffect(() => {
 if (!relationshipIdParam) {
 setLoadingMeta(false);
 setMetaError("missing_param");
 return;
 }

 setRelationshipId(relationshipIdParam);
 writeSelectedRelationshipId(relationshipIdParam);

 async function loadRelationship() {
 try {
 const [relRes, slotRes] = await Promise.all([
 fetch(`/api/relationship/${relationshipIdParam}/status`),
 fetch("/api/partner-slot"),
 ]);

 if (!relRes.ok) {
 setMetaError("not_found");
 return;
 }
 const data = await relRes.json();
 if (data.relationship?.type) {
 setRelationshipType(data.relationship.type);
 }
 if (data.relationship?.connection_name) {
 setConnectionName(data.relationship.connection_name);
 setPartnerName(data.relationship.connection_name);
 }

 if (slotRes.ok) {
 const slot = await slotRes.json();
 const locked = !!(slot.locked || slot.permanent);
 setPartnerSlotLocked(locked);
 setLockedPartnerEmail(slot.email ?? null);
 if (slot.email) {
 setPartnerEmail(slot.email);
 }
 }
 } catch {
 setMetaError("load_failed");
 } finally {
 setLoadingMeta(false);
 }
 }

 void loadRelationship();
 }, [relationshipIdParam]);

 function updateField(key: string, value: string | string[]) {
 setResponses((prev) => ({ ...prev, [key]: value }));
 }

 function toggleHelpArea(id: string) {
 const current = (responses.help_areas as string[]) || [];
 const updated = current.includes(id)
 ? current.filter((a) => a !== id)
 : [...current, id];
 updateField("help_areas", updated);
 }

 async function lockPartnerEmail(): Promise<boolean> {
 if (partnerSlotLocked && lockedPartnerEmail) {
 return true;
 }

 if (!partnerEmail.trim()) {
 setPartnerError("Enter your partner's email address.");
 return false;
 }

 if (!permanentAcknowledged) {
 setPartnerError("Check the box to confirm this email is permanent.");
 return false;
 }

 const confirmed = window.confirm(
 "Are you sure? This partner email is permanent and cannot be changed later."
 );
 if (!confirmed) {
 return false;
 }

 setPartnerError(null);
 const res = await fetch("/api/partner-slot/set", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 email: partnerEmail.trim(),
 duringOnboarding: true,
 confirmPermanent: true,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setPartnerError(data.error || "Could not save partner email");
 return false;
 }

 setPartnerSlotLocked(true);
 setLockedPartnerEmail(data.email ?? partnerEmail.trim().toLowerCase());
 return true;
 }

 async function finishOnboarding() {
 const subRes = await fetch("/api/subscription/status");
 if (subRes.ok) {
 const sub = await subRes.json();
 if (!sub.hasAccess) {
 router.push(
 `/subscribe?redirect=${encodeURIComponent(`/invite?relationship=${relationshipId}`)}`
 );
 return;
 }
 }
 router.push(`/invite?relationship=${relationshipId}`);
 }

 async function saveStep(complete = false) {
 if (!relationshipId) return;

 if (isPartnerStep) {
 setSaving(true);
 try {
 const ok = await lockPartnerEmail();
 if (!ok) return;
 setStep((s) => s + 1);
 } finally {
 setSaving(false);
 }
 return;
 }

 setSaving(true);
 try {
 const demographics = {
 age_range: responses.age_range as string,
 relationship_length: responses.relationship_length as string,
 living_situation: responses.living_situation as string,
 help_areas: responses.help_areas as string[],
 };

 const flatResponses: Record<string, string> = {};
 for (const [k, v] of Object.entries(responses)) {
 flatResponses[k] = Array.isArray(v) ? v.join(", ") : String(v);
 }

 const res = await fetch("/api/onboarding/save", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 relationshipId,
 responses: flatResponses,
 demographics: complete ? demographics : undefined,
 onboardingComplete: complete,
 }),
 });

 if (!res.ok) {
 const data = await res.json();
 throw new Error(data.error || "Failed to save");
 }

 if (complete) {
 await finishOnboarding();
 } else {
 setStep((s) => s + 1);
 }
 } finally {
 setSaving(false);
 }
 }

 if (loadingMeta) {
 return (
 <div className="flex min-h-[40vh] items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 );
 }

 if (metaError || !relationshipId) {
 return (
 <Card>
 <CardContent className="py-16 text-center">
 <p className="font-medium">Choose a connection first</p>
 <p className="mt-2 text-sm text-muted-foreground">
 Onboarding is scoped to one relationship. Open it from your dashboard or create a new connection.
 </p>
 <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
 <Button asChild>
 <Link href="/dashboard">Go to dashboard</Link>
 </Button>
 <Button asChild variant="outline">
 <Link href="/connection/new">New connection</Link>
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 }

 return (
 <div className="mx-auto max-w-2xl space-y-6">
 {connectionName && (
 <p className="text-sm text-muted-foreground">
 Onboarding for <span className="font-medium text-foreground">{connectionName}</span>
 </p>
 )}

 <div>
 <p className="text-sm text-muted-foreground">
 Step {step + 1} of {onboardingSteps.length}
 </p>
 <Progress value={progress} className="mt-2" />
 </div>

 <Card>
 <CardHeader>
 <CardTitle className="font-serif text-2xl">{currentStep.title}</CardTitle>
 <CardDescription>{currentStep.description}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 {isPartnerStep ? (
 <div className="space-y-4">
 {partnerSlotLocked && lockedPartnerEmail ? (
 <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
 <Lock className="mt-0.5 h-4 w-4 shrink-0" />
 <div>
 <p className="font-medium">Included partner (permanent)</p>
 <p className="text-muted-foreground">{lockedPartnerEmail}</p>
 </div>
 </div>
 ) : (
 <>
 <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
 <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
 <p>
 This email is permanent. Your partner must sign in with this exact Google
 account. You cannot change it later.
 </p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="partner-email">Partner email</Label>
 <Input
 id="partner-email"
 type="email"
 placeholder="partner@gmail.com"
 value={partnerEmail}
 onChange={(e) => setPartnerEmail(e.target.value)}
 required
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="partner-name">Partner name (optional)</Label>
 <Input
 id="partner-name"
 placeholder="Their first name"
 value={partnerName}
 onChange={(e) => setPartnerName(e.target.value)}
 />
 </div>

 <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm">
 <input
 type="checkbox"
 className="mt-1 h-4 w-4 rounded border-input"
 checked={permanentAcknowledged}
 onChange={(e) => setPermanentAcknowledged(e.target.checked)}
 />
 <span>I understand this partner email is permanent</span>
 </label>

 {partnerError && (
 <p className="text-sm text-destructive">{partnerError}</p>
 )}
 </>
 )}
 </div>
 ) : currentStep.id === "help_areas" ? (
 <div className="space-y-3">
 <p className="text-xs font-medium text-muted-foreground">Quick answers - tap all that apply</p>
 <div className="grid gap-3 sm:grid-cols-2">
 {HELP_AREAS.map((area) => {
 const selected = ((responses.help_areas as string[]) || []).includes(area.id);
 return (
 <button
 key={area.id}
 type="button"
 onClick={() => toggleHelpArea(area.id)}
 className={cn(
 "min-h-12 rounded-xl border p-4 text-left transition-all touch-manipulation active:scale-[0.98]",
 selected
 ? "border-primary bg-primary text-primary-foreground"
 : "border-border hover:border-primary/40"
 )}
 >
 <p className="font-medium">{area.label}</p>
 </button>
 );
 })}
 </div>
 </div>
 ) : (
 currentStep.fields.map((field) => {
 const quickAnswers = getQuickAnswersForField(field.key);

 return (
 <div key={field.key} className="space-y-2">
 <Label htmlFor={field.key}>{field.label}</Label>
 {field.type === "select" && quickAnswers ? (
 <QuickAnswerChips
 suggestions={quickAnswers.suggestions}
 value={(responses[field.key] as string) || ""}
 onChange={(v) => updateField(field.key, v)}
 multiSelect={false}
 label="Quick answers"
 />
 ) : field.type === "textarea" ? (
 <AnswerInput
 id={field.key}
 placeholder="Share openly - this is a safe space..."
 value={(responses[field.key] as string) || ""}
 onChange={(v) => updateField(field.key, v)}
 quickAnswers={quickAnswers}
 />
 ) : (
 <Input
 id={field.key}
 value={(responses[field.key] as string) || ""}
 onChange={(e) => updateField(field.key, e.target.value)}
 />
 )}
 </div>
 );
 })
 )}

 <div className="flex justify-between pt-4">
 <Button
 variant="outline"
 onClick={() => setStep((s) => Math.max(0, s - 1))}
 disabled={step === 0 || saving}
 >
 <ArrowLeft className="h-4 w-4" />
 Back
 </Button>

 {step < onboardingSteps.length - 1 ? (
 <Button onClick={() => saveStep(false)} disabled={saving}>
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 {isPartnerStep && !partnerSlotLocked ? "Lock & continue" : "Continue"}
 <ArrowRight className="h-4 w-4" />
 </Button>
 ) : (
 <Button onClick={() => saveStep(true)} disabled={saving}>
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
 Complete onboarding
 </Button>
 )}
 </div>
 </CardContent>
 </Card>

 <p className="text-center text-xs text-muted-foreground">
 🔒 Your responses are encrypted before storage
 </p>
 </div>
 );
}

export default function OnboardingPage() {
 return (
 <AppShell>
 <Suspense
 fallback={
 <div className="flex min-h-[40vh] items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 }
 >
 <OnboardingContent />
 </Suspense>
 </AppShell>
 );
}
