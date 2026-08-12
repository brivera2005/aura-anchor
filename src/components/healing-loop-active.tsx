"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Loader2, Repeat } from "lucide-react";
import { AbsorbPeriodBanner } from "@/components/absorb-period-banner";
import { HealingFeed } from "@/components/healing-feed";
import { HealingLoopPoller } from "@/components/healing-loop-poller";
import { PendingQuestionCard } from "@/components/pending-question-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CycleProgressSnapshot } from "@/lib/cycle-progress";
import type { CompletedCycleSummary, FeedEntry } from "@/lib/healing-feed";
import type { AIQuestion } from "@/lib/types";

interface AbsorbPeriodState {
 active: boolean;
 msRemaining: number;
 checkInAvailable: boolean;
 suggestCheckIn: boolean;
}

interface LoopData {
 partnerName: string;
 cycleNumber: number;
 myFirstName: string;
 cycleProgress: CycleProgressSnapshot;
 questionsPerCycle: number;
 questionNumberInCycle: number;
 pendingQuestion: AIQuestion | null;
 feed: FeedEntry[];
 completedCycles: CompletedCycleSummary[];
 cycleAnalysisAvailable: boolean;
 unreadCount: number;
 pagination: { offset: number; limit: number; hasMore: boolean };
 absorbPeriod?: AbsorbPeriodState;
}

export function HealingLoopActive({ relationshipId }: { relationshipId: string }) {
 const [data, setData] = useState<LoopData | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [loadingMore, setLoadingMore] = useState(false);

 const loadData = useCallback(async () => {
 const res = await fetch(`/api/relationship/${relationshipId}/loop-data`);
 if (!res.ok) {
 if (res.status === 401) {
 window.location.href = "/login";
 return null;
 }
 throw new Error("Failed to load healing loop");
 }
 return res.json() as Promise<LoopData>;
 }, [relationshipId]);

 useEffect(() => {
 let cancelled = false;
 async function init() {
 try {
 const json = await loadData();
 if (!cancelled && json) setData(json);
 } catch (err) {
 if (!cancelled) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 }
 }
 }
 init();
 return () => {
 cancelled = true;
 };
 }, [loadData]);

 async function loadMore() {
 if (!data?.pagination.hasMore || loadingMore) return;
 setLoadingMore(true);
 try {
 const nextOffset = data.feed.length;
 const res = await fetch(
 `/api/relationship/${relationshipId}/loop-data?offset=${nextOffset}`
 );
 if (!res.ok) throw new Error("Failed to load more");
 const json: LoopData = await res.json();
 setData((prev) =>
 prev ? { ...json, feed: [...prev.feed, ...json.feed] } : json
 );
 } catch {
 setError("Could not load more entries");
 } finally {
 setLoadingMore(false);
 }
 }

 const refreshLoop = useCallback(async () => {
 const json = await loadData();
 if (json) setData(json);
 }, [loadData]);

 if (error) {
 return (
 <div className="mx-auto max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
 {error}
 </div>
 );
 }

 if (!data) {
 return (
 <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 );
 }

 const {
 partnerName,
 cycleNumber,
 myFirstName,
 cycleProgress,
 questionsPerCycle,
 questionNumberInCycle,
 pendingQuestion,
 feed,
 completedCycles,
 unreadCount,
 pagination,
 absorbPeriod,
 } = data;

 const latestReport = completedCycles.sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
 const totalNeeded = questionsPerCycle * 2;
 const totalDone = cycleProgress.myAnswers + cycleProgress.partnerAnswers;
 const pct = Math.round((totalDone / totalNeeded) * 100);
 const inAbsorb = absorbPeriod?.active;

 return (
 <>
 <HealingLoopPoller relationshipId={relationshipId} />
 <div className="mx-auto max-w-2xl space-y-5 animate-in fade-in duration-300">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="font-serif text-2xl font-semibold sm:text-3xl">
 Healing loop with {partnerName}
 </h1>
 <p className="mt-0.5 text-sm text-muted-foreground">
 Cycle {cycleNumber}
 {!inAbsorb && ` · ${myFirstName} ${cycleProgress.myAnswers}/${questionsPerCycle}`}
 </p>
 </div>
 <div className="flex gap-2">
 {unreadCount > 0 && (
 <Badge variant="default">
 {unreadCount} new briefing{unreadCount > 1 ? "s" : ""}
 </Badge>
 )}
 <Button variant="outline" size="sm" asChild>
 <Link href={`/relationship/${relationshipId}/cycles`}>
 <Repeat className="h-4 w-4" />
 Cycles
 </Link>
 </Button>
 <Button variant="outline" size="sm" asChild>
 <Link href={`/insights?relationship=${relationshipId}`}>
 <Lightbulb className="h-4 w-4" />
 Insights
 </Link>
 </Button>
 </div>
 </div>

 {inAbsorb && absorbPeriod && (
 <AbsorbPeriodBanner
 relationshipId={relationshipId}
 cycleNumber={cycleNumber}
 msRemaining={absorbPeriod.msRemaining}
 checkInAvailable={absorbPeriod.checkInAvailable}
 suggestCheckIn={absorbPeriod.suggestCheckIn}
 onCycleStarted={refreshLoop}
 />
 )}

 {latestReport && inAbsorb && (
 <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
 <Link href={latestReport.reportUrl}>
 Read Cycle {latestReport.cycleNumber} report
 </Link>
 </Button>
 )}

 {!inAbsorb && (
 <>
 <div className="space-y-1.5">
 <div className="flex justify-between text-xs text-muted-foreground">
 <span>
 {myFirstName} {cycleProgress.myAnswers}/{questionsPerCycle} · {partnerName}{" "}
 {cycleProgress.partnerAnswers}/{questionsPerCycle}
 </span>
 <span>{pct}%</span>
 </div>
 <div className="h-1 overflow-hidden rounded-full bg-muted">
 <div
 className="h-full rounded-full bg-primary transition-all duration-500"
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>

 {cycleProgress.myComplete && !cycleProgress.partnerComplete && (
 <Card className="border-amber-500/25 bg-amber-500/5">
 <CardHeader className="py-3">
 <CardTitle className="text-sm">Waiting for {partnerName}</CardTitle>
 <CardDescription className="text-xs">
 You&apos;ve finished your {questionsPerCycle} reflections. They&apos;re at{" "}
 {cycleProgress.partnerAnswers}/{questionsPerCycle}.
 </CardDescription>
 </CardHeader>
 </Card>
 )}

 {pendingQuestion && !cycleProgress.myComplete && (
 <PendingQuestionCard
 questionId={pendingQuestion.id}
 questionText={pendingQuestion.question_text}
 partnerName={partnerName}
 cycleNumber={cycleNumber}
 questionNumberInCycle={questionNumberInCycle}
 questionsPerCycle={questionsPerCycle}
 />
 )}
 </>
 )}

 <HealingFeed
 entries={feed}
 relationshipId={relationshipId}
 partnerName={partnerName}
 completedCycles={completedCycles.filter((c) => c.cycleNumber < cycleNumber)}
 cycleAnalysisAvailable={data.cycleAnalysisAvailable}
 currentCycleNumber={cycleNumber}
 emptyMessage={
 inAbsorb
 ? "Take time with your report - Cycle " + cycleNumber + " starts when you're ready"
 : pendingQuestion
 ? `Question ${questionNumberInCycle} of ${questionsPerCycle} - answer above`
 : "Your reflections will appear here"
 }
 />

 {pagination.hasMore && (
 <div className="flex justify-center pb-4">
 <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
 {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
 </Button>
 </div>
 )}
 </div>
 </>
 );
}
