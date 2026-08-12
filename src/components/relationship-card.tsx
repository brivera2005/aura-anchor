import Link from "next/link";
import { ArrowRight, Heart, Home, Sparkles, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CycleProgressRing } from "@/components/cycle-progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RelationshipPhase } from "@/lib/relationship-phase";
import type { RelationshipSummary } from "@/lib/relationship-data";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, LucideIcon> = {
 spouse: Heart,
 partner: Heart,
 parent: Users,
 child: Users,
 sibling: Users,
 in_law: Users,
 friend: Users,
 ex_partner: Heart,
 roommate: Home,
 other: Users,
};

const PHASE_LABELS: Record<RelationshipPhase, { label: string; variant: "default" | "secondary" | "outline" }> = {
 needs_onboarding: { label: "Needs onboarding", variant: "secondary" },
 needs_invite: { label: "Ready to invite", variant: "outline" },
 waiting_for_partner: { label: "Invite sent", variant: "outline" },
 partner_needs_onboarding: { label: "Waiting on them", variant: "secondary" },
 ready_for_analysis: { label: "Ready to begin", variant: "default" },
 active_loop: { label: "Healing active", variant: "default" },
};

function getActionForPhase(summary: RelationshipSummary): { href: string; label: string } {
 const id = summary.relationship.id;
 switch (summary.phase) {
 case "needs_onboarding":
 return { href: `/onboarding?relationship=${id}`, label: "Start onboarding" };
 case "needs_invite":
 return { href: `/invite?relationship=${id}`, label: "Send invite" };
 case "waiting_for_partner":
 return { href: `/invite?relationship=${id}`, label: "View invite" };
 case "partner_needs_onboarding":
 return { href: `/relationship/${id}/loop`, label: "View progress" };
 case "ready_for_analysis":
 return { href: `/relationship/${id}/loop`, label: "Begin healing" };
 case "active_loop":
 return { href: `/relationship/${id}/loop`, label: "Open healing loop" };
 }
}

function progressLine(summary: RelationshipSummary): string {
 const { myAnswers, partnerAnswers, questionsPerCycle, phase } = summary;
 if (phase === "active_loop") {
 return `You ${myAnswers}/${questionsPerCycle} · Them ${partnerAnswers}/${questionsPerCycle}`;
 }
 if (phase === "waiting_for_partner") {
 return "Waiting for them to accept your invite";
 }
 if (phase === "partner_needs_onboarding") {
 return `${summary.displayName} joined - onboarding in progress`;
 }
 if (phase === "needs_onboarding") {
 return "Complete onboarding for this connection";
 }
 return "Continue setting up this connection";
}

export function RelationshipCard({ summary }: { summary: RelationshipSummary }) {
 const Icon = TYPE_ICONS[summary.relationship.type] ?? Users;
 const phaseInfo = PHASE_LABELS[summary.phase];
 const action = getActionForPhase(summary);

 return (
 <Card
 className={cn(
 "transition-all hover:border-primary/40 hover:shadow-sm",
 summary.phase === "active_loop" && "border-primary/30 bg-primary/5"
 )}
 >
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
 <Icon className="h-5 w-5 text-primary" />
 </div>
 <div>
 <CardTitle className="text-lg">{summary.displayName}</CardTitle>
 <CardDescription>{summary.typeLabel}</CardDescription>
 </div>
 </div>
 <Badge variant={phaseInfo.variant}>{phaseInfo.label}</Badge>
 </div>
 </CardHeader>
 <CardContent className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-3 min-w-0">
 {summary.phase === "active_loop" && (
 <CycleProgressRing
 completed={summary.relationship.themes_covered?.length ?? summary.cycleNumber - 1}
 total={10}
 size={44}
 />
 )}
 <p className="text-sm text-muted-foreground truncate">{progressLine(summary)}</p>
 </div>
 <Button
 asChild
 size="sm"
 variant={summary.phase === "active_loop" ? "default" : "outline"}
 onClick={(e) => e.stopPropagation()}
 >
 <Link href={action.href}>
 {action.label}
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </CardContent>
 </Card>
 );
}

export function NewConnectionCard() {
 return (
 <Card className="border-dashed">
 <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
 <UserPlus className="h-6 w-6 text-primary" />
 </div>
 <div>
 <p className="font-medium">Add another connection</p>
 <p className="mt-1 text-sm text-muted-foreground">
 Parent, sibling, friend, partner - each relationship gets its own healing journey
 </p>
 </div>
 <Button asChild>
 <Link href="/connection/new">
 <Sparkles className="h-4 w-4" />
 New connection
 </Link>
 </Button>
 </CardContent>
 </Card>
 );
}
