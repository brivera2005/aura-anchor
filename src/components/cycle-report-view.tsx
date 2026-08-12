"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  ListChecks,
  MessageCircle,
  Printer,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CycleAnalysis } from "@/lib/types";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export function CycleReportView({
  analysis,
  user1Name,
  user2Name,
  relationshipId,
  backHref,
  showExport = true,
  priorCycleActions,
}: {
  analysis: CycleAnalysis;
  user1Name: string;
  user2Name: string;
  relationshipId: string;
  backHref: string;
  showExport?: boolean;
  priorCycleActions?: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to healing loop
          </Link>
        </Button>
        {showExport && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/relationship/${relationshipId}/cycle/${analysis.cycle_number}/export`}>
              <Printer className="h-4 w-4" />
              Save / Print report
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <Badge>Cycle {analysis.cycle_number}</Badge>
          <Badge variant="secondary">Healing report</Badge>
        </div>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{analysis.title}</h1>
        <p className="mt-3 text-muted-foreground">{analysis.summary}</p>
      </div>

      {priorCycleActions && priorCycleActions.length > 0 && analysis.cycle_number > 1 && (
        <Section title="Follow-up from last cycle" icon={ListChecks}>
          <p className="mb-3 text-sm">
            These actions from Cycle {analysis.cycle_number - 1} were woven into your reflections
            this cycle:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {priorCycleActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.progress_narrative && (
        <Section title="Your progress story" icon={Sparkles}>
          <p className="whitespace-pre-wrap">{analysis.progress_narrative}</p>
        </Section>
      )}

      <Section title="Where you stand together" icon={Users}>
        <p className="whitespace-pre-wrap">{analysis.where_you_stand_together}</p>
      </Section>

      <Section title={`What we heard from ${user1Name}`} icon={Heart}>
        <p className="whitespace-pre-wrap">
          {analysis.heard_from_partner_a || analysis.what_each_needs?.partner_a}
        </p>
      </Section>

      <Section title={`What we heard from ${user2Name}`} icon={Heart}>
        <p className="whitespace-pre-wrap">
          {analysis.heard_from_partner_b || analysis.what_each_needs?.partner_b}
        </p>
      </Section>

      {analysis.perception_gaps?.length > 0 && (
        <Section title="Perception gaps" icon={MessageCircle}>
          <div className="space-y-4">
            {analysis.perception_gaps.map((gap, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="mb-2 font-medium text-foreground">{gap.area}</p>
                <p>
                  <span className="font-medium text-foreground">{user1Name}:</span>{" "}
                  {gap.partner_a_view}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-foreground">{user2Name}:</span>{" "}
                  {gap.partner_b_view}
                </p>
                <p className="mt-2">{gap.gap_description}</p>
                <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                  Valid: {gap.whats_valid}
                </p>
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  Needs attention: {gap.whats_an_issue}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis.whats_working?.length > 0 && (
        <Section title="What's working" icon={CheckCircle2}>
          <ul className="list-disc space-y-1 pl-5">
            {analysis.whats_working.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.needs_attention?.length > 0 && (
        <Section title="What needs attention" icon={MessageCircle}>
          <ul className="list-disc space-y-1 pl-5">
            {analysis.needs_attention.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Why it matters" icon={Sparkles}>
        <p className="whitespace-pre-wrap">
          {analysis.why_it_matters || analysis.why}
        </p>
      </Section>

      <Section title="How to start healing" icon={Heart}>
        <p className="mb-4 whitespace-pre-wrap">
          {analysis.how_to_start_healing || analysis.how_to_improve}
        </p>
        {analysis.joint_actions_this_week?.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 font-medium text-foreground">Together this week</p>
            <ol className="list-decimal space-y-1 pl-5">
              {analysis.joint_actions_this_week.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
        {analysis.partner_a_actions_this_week?.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 font-medium text-foreground">{user1Name}</p>
            <ul className="list-disc space-y-1 pl-5">
              {analysis.partner_a_actions_this_week.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.partner_b_actions_this_week?.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-foreground">{user2Name}</p>
            <ul className="list-disc space-y-1 pl-5">
              {analysis.partner_b_actions_this_week.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {analysis.conversation_starters?.length > 0 && (
        <Section title="Conversation starters" icon={MessageCircle}>
          <ul className="space-y-2">
            {analysis.conversation_starters.map((prompt, i) => (
              <li key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3 italic">
                &ldquo;{prompt}&rdquo;
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.next_cycle_preview && (
        <Section title="Next cycle preview" icon={ListChecks}>
          <p className="whitespace-pre-wrap">{analysis.next_cycle_preview}</p>
        </Section>
      )}

      <div className="flex justify-center pt-4">
        <Button asChild>
          <Link href={`/relationship/${relationshipId}/loop`}>Continue healing loop</Link>
        </Button>
      </div>
    </div>
  );
}
