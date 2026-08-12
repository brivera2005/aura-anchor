"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, Sparkles } from "lucide-react";
import { ABSORB_PERIOD_HOURS } from "@/lib/cycle-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleModePicker } from "@/components/cycle-mode-picker";
import { PrecycleNoteCard } from "@/components/precycle-note-card";

function formatCountdown(ms: number): string {
 if (ms <= 0) return "Ready now";
 const h = Math.floor(ms / 3600000);
 const m = Math.floor((ms % 3600000) / 60000);
 const s = Math.floor((ms % 60000) / 1000);
 if (h > 0) return `${h}h ${m}m`;
 if (m > 0) return `${m}m ${s}s`;
 return `${s}s`;
}

export function AbsorbPeriodBanner({
 relationshipId,
 cycleNumber,
 msRemaining: initialMs,
 checkInAvailable,
 suggestCheckIn,
 onCycleStarted,
}: {
 relationshipId: string;
 cycleNumber: number;
 msRemaining: number;
 checkInAvailable: boolean;
 suggestCheckIn: boolean;
 onCycleStarted?: () => void;
}) {
 const [msRemaining, setMsRemaining] = useState(initialMs);
 const [cycleMode, setCycleMode] = useState<"deep_dive" | "check_in">(
 suggestCheckIn && checkInAvailable ? "check_in" : "deep_dive"
 );
 const [starting, setStarting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 setMsRemaining(initialMs);
 }, [initialMs]);

 useEffect(() => {
 if (msRemaining <= 0) return;
 const t = setInterval(() => {
 setMsRemaining((prev) => Math.max(0, prev - 1000));
 }, 1000);
 return () => clearInterval(t);
 }, [msRemaining]);

 const canStart = msRemaining <= 0;

 const startCycle = useCallback(
 async (skipAbsorb = false) => {
 setStarting(true);
 setError(null);
 try {
 const res = await fetch(`/api/relationship/${relationshipId}/start-next-cycle`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ cycleMode, skipAbsorb }),
 });
 if (!res.ok) {
 const data = await res.json();
 throw new Error(data.error || "Could not start cycle");
 }
 onCycleStarted?.();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 } finally {
 setStarting(false);
 }
 },
 [relationshipId, cycleMode, onCycleStarted]
 );

 return (
 <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/5 animate-in fade-in duration-500">
 <CardHeader className="pb-2">
 <div className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-primary" />
 <CardTitle className="text-lg">Take time to read your report together</CardTitle>
 </div>
 <CardDescription>
 Cycle {cycleNumber - 1} is complete. Before Cycle {cycleNumber} begins, give yourselves
 {ABSORB_PERIOD_HOURS} hours to sit with what you learned - or start when you&apos;re ready.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {!canStart && (
 <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
 <Clock className="h-4 w-4 text-primary shrink-0" />
 <span>
 Cycle {cycleNumber} unlocks in{" "}
 <strong className="text-foreground">{formatCountdown(msRemaining)}</strong>
 </span>
 </div>
 )}

 <PrecycleNoteCard relationshipId={relationshipId} cycleNumber={cycleNumber} />

 {checkInAvailable && (
 <CycleModePicker
 value={cycleMode}
 onChange={setCycleMode}
 suggestCheckIn={suggestCheckIn}
 />
 )}

 {error && (
 <p className="text-sm text-destructive">{error}</p>
 )}

 <div className="flex flex-wrap gap-2">
 {canStart ? (
 <Button onClick={() => startCycle(false)} disabled={starting}>
 {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start Cycle ${cycleNumber}`}
 </Button>
 ) : (
 <Button onClick={() => startCycle(true)} disabled={starting} variant="outline">
 {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start Cycle ${cycleNumber} now`}
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 );
}
