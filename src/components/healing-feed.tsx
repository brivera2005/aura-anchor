"use client";

import { useState, type ReactNode } from "react";
import {
 ChevronDown,
 ChevronUp,
 Heart,
 Lightbulb,
 ListChecks,
 MessageSquare,
 Sparkles,
 User,
} from "lucide-react";
import Link from "next/link";
import { BriefingContent } from "@/components/briefing-content";
import { MarkBriefingRead } from "@/components/mark-briefing-read";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
 groupFeedIntoSections,
 type CompletedCycleSummary,
 type FeedEntry,
 type HealingFeedSections,
} from "@/lib/healing-feed";
import type { CycleAnalysis } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

function CycleAnalysisCard({
 analysis,
 relationshipId,
}: {
 analysis: CycleAnalysis;
 relationshipId: string;
}) {
 const [expanded, setExpanded] = useState(true);

 const reportHref = `/relationship/${relationshipId}/cycle/${analysis.cycle_number}`;

 const previewSections = [
 { title: "Where you stand", content: analysis.where_you_stand_together || analysis.summary },
 { title: "Why it matters", content: analysis.why_it_matters || analysis.why },
 {
 title: "How to start healing",
 content: analysis.how_to_start_healing || analysis.how_to_improve,
 },
 ].filter((s) => s.content);

 return (
 <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 ring-2 ring-primary/20">
 <CardContent className="p-0">
 <button
 type="button"
 onClick={() => setExpanded(!expanded)}
 className="flex w-full items-center justify-between gap-3 p-4 text-left"
 >
 <div>
 <div className="mb-1 flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-primary" />
 <Badge variant="secondary" className="text-xs">
 Cycle {analysis.cycle_number} complete
 </Badge>
 </div>
 <h3 className="font-serif text-lg font-semibold">{analysis.title}</h3>
 <p className="mt-1 text-sm text-muted-foreground">{analysis.summary}</p>
 </div>
 {expanded ? (
 <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
 ) : (
 <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
 )}
 </button>

 {expanded && (
 <div className="space-y-3 border-t border-border/50 px-4 pb-4 pt-3">
 {previewSections.map((s) => (
 <div key={s.title} className="rounded-lg border border-border/60 bg-background/80 p-3">
 <p className="mb-1 text-sm font-medium">{s.title}</p>
 <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
 {s.content}
 </p>
 </div>
 ))}

 {analysis.joint_actions_this_week?.length > 0 && (
 <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
 <p className="mb-2 flex items-center gap-2 text-sm font-medium">
 <ListChecks className="h-4 w-4 text-emerald-600" />
 Start this week
 </p>
 <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
 {analysis.joint_actions_this_week.slice(0, 3).map((step, i) => (
 <li key={i}>{step}</li>
 ))}
 </ol>
 </div>
 )}

 <Link
 href={reportHref}
 className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
 >
 Read full healing report
 </Link>
 </div>
 )}
 </CardContent>
 </Card>
 );
}

function FeedEntryCard({
 entry,
 relationshipId,
}: {
 entry: FeedEntry;
 relationshipId: string;
}) {
 const isBriefing = entry.type === "partner_briefing";
 const isAnswer = entry.type === "your_answer";

 if (entry.type === "cycle_analysis" && entry.meta?.cycleAnalysis) {
 return (
 <CycleAnalysisCard
 analysis={entry.meta.cycleAnalysis}
 relationshipId={relationshipId}
 />
 );
 }

 return (
 <Card
 className={cn(
 "overflow-hidden",
 isAnswer && "border-primary/20 bg-primary/5",
 isBriefing && "border-accent bg-accent/25 dark:bg-accent/15",
 entry.type === "insight" && "border-primary/25 bg-primary/5",
 entry.meta?.isUnread && "ring-1 ring-primary/30"
 )}
 >
 <CardContent className="p-4">
 <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
 {isAnswer && <User className="h-3.5 w-3.5" />}
 {isBriefing && <Heart className="h-3.5 w-3.5" />}
 {entry.type === "insight" && <Lightbulb className="h-3.5 w-3.5" />}
 <span>{entry.title}</span>
 {entry.meta?.cycleNumber != null && (
 <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
 Cycle {entry.meta.cycleNumber}
 </Badge>
 )}
 {entry.meta?.isUnread && <Badge className="h-5 px-1.5 text-[10px]">New</Badge>}
 <span className="opacity-60">· {formatDate(entry.created_at)}</span>
 </div>

 {entry.type === "insight" && entry.meta?.healthScore != null && (
 <p className="mb-2 font-serif text-xl font-semibold text-primary">
 {entry.meta.healthScore}/100
 </p>
 )}

 {isBriefing ? (
 <BriefingContent content={entry.body} />
 ) : (
 <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
 )}

 {isBriefing && entry.meta?.isUnread && entry.meta.briefingId && (
 <div className="mt-3 border-t border-border/40 pt-3">
 <MarkBriefingRead briefingId={entry.meta.briefingId} />
 </div>
 )}
 </CardContent>
 </Card>
 );
}

function FeedSection({
 title,
 icon: Icon,
 entries,
 emptyText,
 relationshipId,
}: {
 title: string;
 icon: typeof MessageSquare;
 entries: FeedEntry[];
 emptyText?: string;
 relationshipId: string;
}) {
 if (entries.length === 0 && !emptyText) return null;

 return (
 <section className="space-y-3">
 <h3 className="flex items-center gap-2 font-serif text-base font-semibold">
 <Icon className="h-4 w-4 text-primary" />
 {title}
 </h3>
 {entries.length === 0 ? (
 <p className="text-sm text-muted-foreground">{emptyText}</p>
 ) : (
 <div className="space-y-3">
 {entries.map((entry) => (
 <FeedEntryCard key={entry.id} entry={entry} relationshipId={relationshipId} />
 ))}
 </div>
 )}
 </section>
 );
}

export function HealingFeed({
 entries,
 relationshipId,
 partnerName,
 completedCycles = [],
 cycleAnalysisAvailable = false,
 currentCycleNumber,
 emptyMessage,
}: {
 entries: FeedEntry[];
 relationshipId: string;
 partnerName?: string;
 user1Name?: string;
 user2Name?: string;
 completedCycles?: CompletedCycleSummary[];
 cycleAnalysisAvailable?: boolean;
 currentCycleNumber?: number;
 emptyMessage?: string;
}) {
 const sections: HealingFeedSections = groupFeedIntoSections(entries);
 const hasContent =
 sections.yourAnswers.length > 0 ||
 sections.partnerBriefings.length > 0 ||
 sections.cycleProgress.length > 0 ||
 completedCycles.length > 0 ||
 cycleAnalysisAvailable;

 if (!hasContent) {
 return (
 <Card>
 <CardContent className="flex flex-col items-center py-12 text-center">
 <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
 <p className="font-medium">{emptyMessage || "Your healing journey starts here"}</p>
 <p className="mt-2 max-w-sm text-sm text-muted-foreground">
 Each partner answers 5 reflections per cycle. When you both finish, a comprehensive
 healing report unlocks for both of you.
 </p>
 <Link
 href={`/insights?relationship=${relationshipId}`}
 className="mt-4 text-sm text-primary hover:underline"
 >
 View insights
 </Link>
 </CardContent>
 </Card>
 );
 }

 const partnerFirst = partnerName?.split(/\s+/)[0] || "your partner";

 return (
 <div className="space-y-8">
 {completedCycles.length > 0 && (
 <section className="space-y-3">
 <h3 className="flex items-center gap-2 font-serif text-base font-semibold">
 <Sparkles className="h-4 w-4 text-primary" />
 Completed cycles
 </h3>
 <div className="space-y-3">
 {completedCycles.map((cycle) => (
 <Card
 key={cycle.cycleNumber}
 className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 ring-2 ring-primary/20"
 >
 <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-2">
 <Badge variant="secondary" className="text-xs">
 Cycle {cycle.cycleNumber} complete
 </Badge>
 </div>
 <h4 className="font-serif text-lg font-semibold">{cycle.title}</h4>
 {cycle.summary && (
 <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
 {cycle.summary}
 </p>
 )}
 </div>
 <Link
 href={cycle.reportUrl}
 className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
 >
 Read full healing report
 </Link>
 </CardContent>
 </Card>
 ))}
 </div>
 </section>
 )}

 <FeedSection
 title={
 currentCycleNumber && currentCycleNumber > 1
 ? `Your reflections (all cycles)`
 : "Your reflections"
 }
 icon={User}
 entries={sections.yourAnswers}
 emptyText="Your answers will appear here as you complete reflections."
 relationshipId={relationshipId}
 />

 <FeedSection
 title={`For you about ${partnerFirst}`}
 icon={Heart}
 entries={sections.partnerBriefings}
 emptyText={`When ${partnerFirst} answers, you'll receive counseling briefings here - never their raw words.`}
 relationshipId={relationshipId}
 />

 <FeedSection
 title="Cycle progress"
 icon={Sparkles}
 entries={sections.cycleProgress}
 emptyText="Complete 5 reflections each for your healing report."
 relationshipId={relationshipId}
 />
 </div>
 );
}
