"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Loader2, Sparkles } from "lucide-react";
import { CyclesTimeline } from "@/components/cycles-timeline";
import { ThemeCoverageChart } from "@/components/theme-coverage-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CycleHistorySummary } from "@/lib/cycle-history";

interface CyclesPageData {
 history: CycleHistorySummary;
 partnerName: string;
}

export function CyclesPageClient({ relationshipId }: { relationshipId: string }) {
 const [data, setData] = useState<CyclesPageData | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 async function load() {
 try {
 const res = await fetch(`/api/relationship/${relationshipId}/cycles`);
 if (!res.ok) throw new Error("Failed to load cycles");
 const json = await res.json();
 if (!cancelled) {
 setData({ history: json.history, partnerName: json.partnerName });
 }
 } catch (err) {
 if (!cancelled) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 }
 }
 }
 void load();
 return () => {
 cancelled = true;
 };
 }, [relationshipId]);

 if (error) {
 return (
 <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
 {error}
 </div>
 );
 }

 if (!data) {
 return (
 <div className="flex items-center justify-center py-24">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 );
 }

 const { history, partnerName } = data;
 const completed = history.cycles.filter((c) => !c.inProgress);

 return (
 <div className="space-y-8 animate-in fade-in duration-500">
 <div>
 <h1 className="font-serif text-3xl font-semibold">Cycles</h1>
 <p className="mt-1 text-muted-foreground">
 Your healing journey with {partnerName} - {history.completedCount} cycle
 {history.completedCount === 1 ? "" : "s"} completed
 </p>
 </div>

 {history.progressNarrative && (
 <Card className="border-primary/20 bg-primary/5">
 <CardHeader className="pb-2">
 <CardTitle className="flex items-center gap-2 text-lg">
 <Sparkles className="h-5 w-5 text-primary" />
 Your progress story
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm leading-relaxed text-muted-foreground">
 {history.progressNarrative}
 </p>
 </CardContent>
 </Card>
 )}

 {history.cycles.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Timeline</CardTitle>
 <CardDescription>Cycle 1 through your current cycle</CardDescription>
 </CardHeader>
 <CardContent>
 <CyclesTimeline cycles={history.cycles} />
 </CardContent>
 </Card>
 )}

 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Theme coverage</CardTitle>
 <CardDescription>10 relationship themes - each explored once before repeating</CardDescription>
 </CardHeader>
 <CardContent>
 <ThemeCoverageChart coveredThemes={history.allThemesCovered} />
 </CardContent>
 </Card>

 {completed.length === 0 ? (
 <Card>
 <CardContent className="py-16 text-center">
 <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
 <p className="font-medium">No completed cycles yet</p>
 <p className="mt-1 text-sm text-muted-foreground">
 Complete your first healing cycle to see reports here
 </p>
 <Button asChild className="mt-4">
 <Link href={`/relationship/${relationshipId}/loop`}>Go to healing loop</Link>
 </Button>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-3">
 <h2 className="font-serif text-xl font-semibold">All cycles</h2>
 {[...history.cycles].reverse().map((cycle) => (
 <Card
 key={cycle.cycleNumber}
 className={
 cycle.inProgress
 ? "border-primary/30 bg-primary/5"
 : "transition-all hover:border-primary/30"
 }
 >
 <CardHeader className="pb-2">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div className="space-y-1">
 <div className="flex flex-wrap items-center gap-2">
 <Badge variant={cycle.inProgress ? "default" : "secondary"}>
 Cycle {cycle.cycleNumber}
 </Badge>
 {cycle.inProgress && (
 <Badge variant="outline">In progress</Badge>
 )}
 </div>
 <CardTitle className="text-base">{cycle.title}</CardTitle>
 {cycle.themeLabels.length > 0 && (
 <CardDescription className="text-xs">
 {cycle.themeLabels.join(" · ")}
 </CardDescription>
 )}
 <p className="text-sm text-muted-foreground line-clamp-2">{cycle.summary}</p>
 </div>
 {!cycle.inProgress && (
 <Button asChild size="sm" variant="outline">
 <Link href={cycle.reportUrl}>
 View report
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 )}
 </div>
 </CardHeader>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
