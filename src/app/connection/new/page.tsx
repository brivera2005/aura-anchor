"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 RELATIONSHIP_SUBTYPES,
 RELATIONSHIP_TYPES,
} from "@/lib/constants";
import { writeSelectedRelationshipId } from "@/lib/selected-relationship-storage";
import type { RelationshipSubtype, RelationshipType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "type" | "subtype" | "details";

export default function NewConnectionPage() {
 const router = useRouter();
 const [step, setStep] = useState<Step>("type");
 const [type, setType] = useState<RelationshipType | null>(null);
 const [subtype, setSubtype] = useState<RelationshipSubtype | null>(null);
 const [connectionName, setConnectionName] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const subtypes = type ? RELATIONSHIP_SUBTYPES[type] : [];

 async function createConnection() {
 if (!type || !connectionName.trim()) return;
 setLoading(true);
 setError(null);

 try {
 const createRes = await fetch("/api/relationships/create", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 type,
 subtype,
 connectionName: connectionName.trim(),
 }),
 });
 const createData = await createRes.json();
 if (!createRes.ok) {
 if (createData.existingRelationshipId) {
 setError(
 `${createData.error} You can continue with your existing connection instead.`
 );
 return;
 }
 throw new Error(createData.error || "Failed to create connection");
 }

 const relId = createData.relationshipId as string;
 writeSelectedRelationshipId(relId);
 router.push(`/onboarding?relationship=${relId}`);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 } finally {
 setLoading(false);
 }
 }

 return (
 <AppShell>
 <div className="mx-auto max-w-lg space-y-6">
 <div>
 <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="mb-4">
 <ArrowLeft className="h-4 w-4" />
 Back to dashboard
 </Button>
 <h1 className="font-serif text-3xl font-semibold">New connection</h1>
 <p className="mt-1 text-muted-foreground">
 Each relationship gets its own onboarding and healing journey
 </p>
 </div>

 {step === "type" && (
 <Card>
 <CardHeader>
 <CardTitle>Who is this person to you?</CardTitle>
 <CardDescription>Choose the relationship type that fits best</CardDescription>
 </CardHeader>
 <CardContent className="grid gap-2 sm:grid-cols-2">
 {RELATIONSHIP_TYPES.map(({ value, label, description }) => (
 <button
 key={value}
 type="button"
 onClick={() => {
 setType(value);
 setSubtype(null);
 setStep(RELATIONSHIP_SUBTYPES[value].length > 0 ? "subtype" : "details");
 }}
 className={cn(
 "rounded-xl border p-4 text-left transition-all hover:border-primary/40",
 type === value && "border-primary bg-primary/5"
 )}
 >
 <p className="font-medium">{label}</p>
 <p className="mt-1 text-xs text-muted-foreground">{description}</p>
 </button>
 ))}
 </CardContent>
 </Card>
 )}

 {step === "subtype" && type && subtypes.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle>Be more specific</CardTitle>
 <CardDescription>Optional - helps personalize your guide</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid gap-2 sm:grid-cols-2">
 {subtypes.map(({ value, label }) => (
 <button
 key={value}
 type="button"
 onClick={() => {
 setSubtype(value);
 setStep("details");
 }}
 className={cn(
 "rounded-xl border px-4 py-3 text-left text-sm transition-all hover:border-primary/40",
 subtype === value && "border-primary bg-primary/5"
 )}
 >
 {label}
 </button>
 ))}
 </div>
 <Button variant="outline" onClick={() => setStep("details")}>
 Skip - use general type
 <ArrowRight className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => setStep("type")}>
 <ArrowLeft className="h-4 w-4" />
 Change type
 </Button>
 </CardContent>
 </Card>
 )}

 {step === "details" && type && (
 <Card>
 <CardHeader>
 <CardTitle>Name this connection</CardTitle>
 <CardDescription>
 You&apos;ll set your included partner email during onboarding, then subscribe and send an invite
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="name">Their name</Label>
 <Input
 id="name"
 placeholder="Sarah, Mom, Jake..."
 value={connectionName}
 onChange={(e) => setConnectionName(e.target.value)}
 autoFocus
 />
 </div>
 {error && <p className="text-sm text-destructive">{error}</p>}
 <div className="flex gap-2">
 <Button
 variant="outline"
 onClick={() => setStep(subtypes.length > 0 ? "subtype" : "type")}
 disabled={loading}
 >
 <ArrowLeft className="h-4 w-4" />
 Back
 </Button>
 <Button
 className="flex-1"
 disabled={!connectionName.trim() || loading}
 onClick={() => createConnection()}
 >
 {loading ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 <>
 Start onboarding
 <ArrowRight className="h-4 w-4" />
 </>
 )}
 </Button>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 </AppShell>
 );
}
