"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, Heart, Link2, Loader2, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { InviteLinkShare } from "@/components/invite-link-share";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 RELATIONSHIP_SUBTYPES,
 RELATIONSHIP_TYPES,
 getRelationshipLabel,
} from "@/lib/constants";
import type { RelationshipSubtype, RelationshipType } from "@/lib/types";

function InvitePageContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const relationshipIdParam = searchParams.get("relationship");
 const emailParam = searchParams.get("email");

 const [email, setEmail] = useState(emailParam ?? "");
 const [slotLocked, setSlotLocked] = useState(false);
 const [slotEmail, setSlotEmail] = useState<string | null>(null);
 const [relationshipType, setRelationshipType] = useState<RelationshipType>("partner");
 const [subtype, setSubtype] = useState<RelationshipSubtype | "">("");
 const [relationshipId, setRelationshipId] = useState<string | null>(relationshipIdParam);
 const [connectionName, setConnectionName] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [inviteLink, setInviteLink] = useState<string | null>(null);
 const [inviteId, setInviteId] = useState<string | null>(null);
 const [emailSent, setEmailSent] = useState(false);
 const [emailConfigured, setEmailConfigured] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [loadingExisting, setLoadingExisting] = useState(true);

 useEffect(() => {
 async function loadContext() {
 try {
 const slotRes = await fetch("/api/partner-slot");
 if (slotRes.ok) {
 const slot = await slotRes.json();
 setSlotLocked(!!slot.locked || !!slot.permanent);
 setSlotEmail(slot.email ?? null);
 if (slot.email && !emailParam) {
 setEmail(slot.email);
 }
 }

 if (relationshipIdParam) {
 const res = await fetch(`/api/relationship/${relationshipIdParam}/status`);
 if (res.ok) {
 const data = await res.json();
 if (data.relationship) {
 setRelationshipType(data.relationship.type);
 setSubtype(data.relationship.relationship_subtype || "");
 setConnectionName(data.relationship.connection_name);
 setRelationshipId(data.relationship.id);
 }
 if (data.pendingInvite?.inviteLink) {
 setInviteLink(data.pendingInvite.inviteLink);
 setInviteId(data.pendingInvite.id);
 setEmail(data.pendingInvite.to_email ?? "");
 }
 return;
 }
 }

 const res = await fetch("/api/invites/pending");
 if (!res.ok) return;
 const data = await res.json();
 if (data.inviteLink) {
 setInviteLink(data.inviteLink);
 setInviteId(data.invite?.id ?? null);
 setEmail(data.invite?.to_email ?? "");
 setRelationshipId(data.invite?.relationship_id ?? null);
 if (data.invite?.relationship_type) {
 setRelationshipType(data.invite.relationship_type);
 }
 }
 } finally {
 setLoadingExisting(false);
 }
 }
 loadContext();
 }, [relationshipIdParam, emailParam]);

 useEffect(() => {
 const preset = searchParams.get("email");
 if (preset && !inviteLink) {
 setEmail(preset);
 }
 }, [searchParams, inviteLink]);

 async function sendInvite(e: React.FormEvent) {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 const res = await fetch("/api/invites/send", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 toEmail: email,
 relationshipType,
 relationshipId,
 subtype: subtype || undefined,
 }),
 });

 const data = await res.json();
 if (!res.ok) throw new Error(data.error || "Failed to create invite");

 setInviteLink(data.inviteLink);
 setInviteId(data.invite?.id ?? null);
 setEmailSent(!!data.emailSent);
 setEmailConfigured(!!data.emailConfigured);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 } finally {
 setLoading(false);
 }
 }

 const subtypes = RELATIONSHIP_SUBTYPES[relationshipType] || [];
 const typeLabel = getRelationshipLabel(
 relationshipType,
 subtype || null
 );

 return (
 <AppShell>
 <div className="mx-auto max-w-lg space-y-6">
 <div>
 <h1 className="font-serif text-3xl font-semibold">
 {connectionName ? `Invite ${connectionName}` : "Invite your person"}
 </h1>
 <p className="mt-1 text-muted-foreground">
 Create a secure link to connect and heal together
 </p>
 </div>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Heart className="h-5 w-5 text-primary" />
 {connectionName ? `Invite for ${connectionName}` : "Connection invite"}
 </CardTitle>
 <CardDescription>
 We&apos;ll create a personal link - copy and text it, or we&apos;ll email it if configured
 </CardDescription>
 </CardHeader>

 <CardContent>
 {loadingExisting && !inviteLink ? (
 <div className="flex justify-center py-8">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 ) : inviteLink ? (
 <div className="space-y-4">
 <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
 <Check className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
 <p className="font-medium">Invite ready!</p>
 <p className="text-sm text-muted-foreground">
 {emailSent
 ? `Email sent to ${email} - and you can copy the link below`
 : `Share the link below with ${email || connectionName || "them"}`}
 </p>
 </div>
 <InviteLinkShare
 inviteLink={inviteLink}
 partnerEmail={email}
 emailSent={emailSent}
 emailConfigured={emailConfigured}
 inviteId={inviteId ?? undefined}
 variant="prominent"
 />
 <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
 Back to dashboard
 </Button>
 </div>
 ) : (
 <form onSubmit={sendInvite} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="email">Their email</Label>
 <Input
 id="email"
 type="email"
 placeholder="their@email.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 disabled={slotLocked && !!slotEmail}
 required
 />
 {slotLocked && slotEmail ? (
 <p className="flex items-center gap-1 text-xs text-muted-foreground">
 <Lock className="h-3 w-3" />
 Locked to your included partner email
 </p>
 ) : (
 <p className="text-xs text-muted-foreground">
 Set during onboarding - must match your locked included partner email.
 </p>
 )}
 </div>

 {!relationshipIdParam && (
 <>
 <div className="space-y-2">
 <Label htmlFor="type">Relationship type</Label>
 <select
 id="type"
 className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
 value={relationshipType}
 onChange={(e) => {
 setRelationshipType(e.target.value as RelationshipType);
 setSubtype("");
 }}
 >
 {RELATIONSHIP_TYPES.map(({ value, label }) => (
 <option key={value} value={value}>
 {label}
 </option>
 ))}
 </select>
 </div>

 {subtypes.length > 0 && (
 <div className="space-y-2">
 <Label htmlFor="subtype">More specific (optional)</Label>
 <select
 id="subtype"
 className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
 value={subtype}
 onChange={(e) => setSubtype(e.target.value as RelationshipSubtype)}
 >
 <option value="">General {RELATIONSHIP_TYPES.find((t) => t.value === relationshipType)?.label}</option>
 {subtypes.map(({ value, label }) => (
 <option key={value} value={value}>
 {label}
 </option>
 ))}
 </select>
 </div>
 )}
 </>
 )}

 {relationshipIdParam && (
 <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
 Inviting as: <span className="font-medium text-foreground">{typeLabel}</span>
 </p>
 )}

 {error && <p className="text-sm text-destructive">{error}</p>}

 <Button type="submit" className="w-full" size="lg" disabled={loading}>
 {loading ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <Link2 className="h-4 w-4" />
 )}
 Create invite link
 </Button>
 </form>
 )}
 </CardContent>
 </Card>
 </div>
 </AppShell>
 );
}

export default function InvitePage() {
 return (
 <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
 <InvitePageContent />
 </Suspense>
 );
}
