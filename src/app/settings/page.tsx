"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
 ArrowRight,
 Bell,
 CreditCard,
 Lock,
 Moon,
 Shield,
 User,
 Users,
} from "lucide-react";
import {
 formatSubscriptionStatus,
} from "@/lib/subscription";
import { isActiveSubscriptionStatus } from "@/lib/stripe";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { getRelationshipLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Relationship } from "@/lib/types";

export default function SettingsPage() {
 const [profile, setProfile] = useState<Profile | null>(null);
 const [relationships, setRelationships] = useState<Relationship[]>([]);
 const [name, setName] = useState("");
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const [billingLoading, setBillingLoading] = useState(false);
 const [partnerHasSubscription, setPartnerHasSubscription] = useState(false);
 const [partnerSlotEmail, setPartnerSlotEmail] = useState<string | null>(null);
 const [partnerSlotLocked, setPartnerSlotLocked] = useState(false);
 const [partnerSlotLockedAt, setPartnerSlotLockedAt] = useState<string | null>(null);

 useEffect(() => {
 async function load() {
 const supabase = createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 const { data } = await supabase
 .from("profiles")
 .select("*")
 .eq("user_id", user.id)
 .single();

 if (data) {
 setProfile(data);
 setName(data.name || "");
 }

 const res = await fetch("/api/relationships/create");
 if (res.ok) {
 const json = await res.json();
 setRelationships(json.relationships || []);
 }

 const subRes = await fetch("/api/subscription/status");
 if (subRes.ok) {
 const subJson = await subRes.json();
 setPartnerHasSubscription(!!subJson.partnerHasSubscription);
 setPartnerSlotEmail(subJson.partnerSlot?.email ?? null);
 setPartnerSlotLocked(!!subJson.partnerSlot?.locked);
 setPartnerSlotLockedAt(subJson.partnerSlot?.lockedAt ?? null);
 }

 const slotRes = await fetch("/api/partner-slot");
 if (slotRes.ok) {
 const slotJson = await slotRes.json();
 setPartnerSlotEmail(slotJson.email ?? null);
 setPartnerSlotLocked(!!slotJson.locked);
 setPartnerSlotLockedAt(slotJson.lockedAt ?? null);
 }
 }
 load();
 }, []);

 async function saveProfile(e: React.FormEvent) {
 e.preventDefault();
 setSaving(true);
 const supabase = createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 await supabase.from("profiles").update({ name }).eq("user_id", user.id);
 setSaving(false);
 setSaved(true);
 setTimeout(() => setSaved(false), 2000);
 }

 async function openBillingPortal() {
 setBillingLoading(true);
 try {
 const res = await fetch("/api/stripe/create-portal-session", {
 method: "POST",
 });
 const data = await res.json();
 if (data.url) {
 window.location.href = data.url;
 return;
 }
 } finally {
 setBillingLoading(false);
 }
 }

 const ownSubActive = isActiveSubscriptionStatus(profile?.subscription_status);
 const isLifetime = profile?.subscription_status === "lifetime";
 const hasAccess = ownSubActive || partnerHasSubscription;
 const periodEnd = profile?.subscription_current_period_end
 ? new Date(profile.subscription_current_period_end).toLocaleDateString()
 : null;

 return (
 <AppShell userName={profile?.name}>
 <div className="mx-auto max-w-2xl space-y-8">
 <div>
 <h1 className="font-serif text-3xl font-semibold">Settings</h1>
 <p className="mt-1 text-muted-foreground">Manage your profile and connections</p>
 </div>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <CreditCard className="h-5 w-5" />
 Subscription
 </CardTitle>
 <CardDescription>
 One subscription includes one partner who joins free
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex flex-wrap items-center gap-2">
 <Badge variant={hasAccess ? "default" : "secondary"}>
 {ownSubActive
 ? formatSubscriptionStatus(profile?.subscription_status)
 : partnerHasSubscription
 ? "Included via partner"
 : formatSubscriptionStatus(profile?.subscription_status)}
 </Badge>
 {periodEnd && ownSubActive && (
 <span className="text-sm text-muted-foreground">
 Renews {periodEnd}
 </span>
 )}
 </div>
 {ownSubActive && !isLifetime ? (
 <Button
 variant="outline"
 onClick={openBillingPortal}
 disabled={billingLoading}
 >
 {billingLoading ? "Opening..." : "Manage billing"}
 </Button>
 ) : isLifetime ? (
 <p className="text-sm text-muted-foreground">
 You have lifetime access - no further billing required.
 </p>
 ) : partnerHasSubscription ? (
 <p className="text-sm text-muted-foreground">
 Your partner&apos;s subscription covers this connection. You can
 start your own subscription anytime if you add new connections.
 </p>
 ) : (
 <Button asChild>
 <Link href="/subscribe">Start subscription</Link>
 </Button>
 )}
 {ownSubActive && partnerSlotLocked && partnerSlotEmail && (
 <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
 <Lock className="mt-0.5 h-4 w-4 shrink-0" />
 <div>
 <p className="font-medium">Included partner (permanent)</p>
 <p className="text-muted-foreground">{partnerSlotEmail}</p>
 {partnerSlotLockedAt && (
 <p className="mt-1 text-xs text-muted-foreground">
 Locked on {new Date(partnerSlotLockedAt).toLocaleDateString()}
 </p>
 )}
 </div>
 </div>
 )}
 {ownSubActive && !partnerSlotLocked && (
 <p className="text-sm text-muted-foreground">
 Set your included partner email during onboarding - it locks permanently on confirm.
 </p>
 )}
 </CardContent>
 </Card>

 {(ownSubActive || partnerSlotLocked) && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Users className="h-5 w-5" />
 Included partner
 </CardTitle>
 <CardDescription>
 One partner joins free on your subscription
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {partnerSlotLocked && partnerSlotEmail ? (
 <>
 <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
 <Lock className="mt-0.5 h-4 w-4 shrink-0" />
 <div>
 <p className="font-medium">Included partner (permanent)</p>
 <p className="text-muted-foreground">{partnerSlotEmail}</p>
 {partnerSlotLockedAt && (
 <p className="mt-1 text-xs text-muted-foreground">
 Locked on {new Date(partnerSlotLockedAt).toLocaleDateString()} - contact support to change
 </p>
 )}
 </div>
 </div>
 <Button asChild variant="outline" className="w-full">
 <Link href={`/invite?email=${encodeURIComponent(partnerSlotEmail)}`}>
 Send invite
 </Link>
 </Button>
 </>
 ) : (
 <div className="space-y-3">
 <p className="text-sm text-muted-foreground">
 Not set yet. Complete onboarding for a connection to lock your included partner email.
 </p>
 <Button asChild variant="outline" className="w-full">
 <Link href="/connection/new">Start onboarding</Link>
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Users className="h-5 w-5" />
 Your connections
 </CardTitle>
 <CardDescription>
 All relationships you&apos;re healing - each has its own journey
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-3">
 {relationships.length === 0 ? (
 <p className="text-sm text-muted-foreground">No connections yet.</p>
 ) : (
 relationships.map((rel) => (
 <div
 key={rel.id}
 className="flex items-center justify-between rounded-xl border border-border p-4"
 >
 <div>
 <p className="font-medium">
 {rel.connection_name || getRelationshipLabel(rel.type, rel.relationship_subtype)}
 </p>
 <p className="text-sm text-muted-foreground">
 {getRelationshipLabel(rel.type, rel.relationship_subtype)}
 {rel.status !== "active" && (
 <Badge variant="secondary" className="ml-2 text-xs">
 {rel.status}
 </Badge>
 )}
 </p>
 </div>
 <Button asChild size="sm" variant="outline">
 <Link href={`/relationship/${rel.id}/loop`}>
 Open
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </div>
 ))
 )}
 <Button asChild variant="outline" className="w-full">
 <Link href="/connection/new">Add new connection</Link>
 </Button>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <User className="h-5 w-5" />
 Profile
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={saveProfile} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="name">Display name</Label>
 <Input
 id="name"
 value={name}
 onChange={(e) => setName(e.target.value)}
 />
 </div>
 <div className="space-y-2">
 <Label>Email</Label>
 <Input value={profile?.email || ""} disabled />
 </div>
 <Button type="submit" disabled={saving}>
 {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
 </Button>
 </form>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Moon className="h-5 w-5" />
 Appearance
 </CardTitle>
 <CardDescription>Toggle between light and dark mode</CardDescription>
 </CardHeader>
 <CardContent>
 <ThemeToggle />
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Bell className="h-5 w-5" />
 Notifications
 </CardTitle>
 <CardDescription>
 Push notifications architecture is ready - wire up when deploying
 </CardDescription>
 </CardHeader>
 <CardContent>
 <Badge variant="secondary">Coming soon</Badge>
 <p className="mt-2 text-sm text-muted-foreground">
 You&apos;ll be notified when someone sends an answer or you receive a new briefing.
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Shield className="h-5 w-5" />
 Privacy & security
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
 <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
 <div>
 <p className="font-medium">End-to-end application encryption</p>
 <p className="text-sm text-muted-foreground">
 Your onboarding responses and question answers are encrypted with AES-256-GCM
 before being stored in the database. Only you and the app can decrypt them.
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </AppShell>
 );
}
