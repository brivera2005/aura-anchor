import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, Heart, Lightbulb, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RelationshipParamRedirect } from "@/components/relationship-param-redirect";
import { ThemeCoverageChart } from "@/components/theme-coverage-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnalyzeOnboardingButton } from "@/components/analyze-button";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getConnectionDisplayName } from "@/lib/partner-names";
import { isEmptyDataAnalysis } from "@/lib/onboarding-responses";
import { getRelationshipLabel } from "@/lib/relationship-types";
import { createClient } from "@/lib/supabase/server";
import type { CycleAnalysis, OnboardingAnalysis } from "@/lib/types";
import { loadCycleHistory } from "@/lib/cycle-history";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
 searchParams,
}: {
 searchParams: Promise<{ relationship?: string }>;
}) {
 const user = await getCurrentUser();
 if (!user) redirect("/login");

 const params = await searchParams;
 if (!params.relationship) {
 return (
 <AppShell>
 <Suspense>
 <RelationshipParamRedirect />
 </Suspense>
 </AppShell>
 );
 }

 const relationshipId = params.relationship;
 const supabase = await createClient();

 const { data: activeRelationship } = await supabase
 .from("relationships")
 .select("*")
 .eq("id", relationshipId)
 .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
 .single();

 if (!activeRelationship) {
 redirect("/dashboard");
 }

 const connectionLabel = getConnectionDisplayName(activeRelationship, null);
 const typeLabel = getRelationshipLabel(
 activeRelationship.type,
 activeRelationship.relationship_subtype
 );

 const { data: insightRow } = await supabase
 .from("relationship_insights")
 .select("*")
 .eq("relationship_id", activeRelationship.id)
 .eq("insight_type", "onboarding_analysis")
 .order("created_at", { ascending: false })
 .limit(1)
 .single();

 const analysis = insightRow?.content as OnboardingAnalysis | undefined;
 const analysisInvalid = isEmptyDataAnalysis(analysis?.summary);

 const { data: profiles } = await supabase
 .from("profiles")
 .select("onboarding_completed")
 .in("user_id", [activeRelationship.user1_id, activeRelationship.user2_id!]);

 const bothOnboarded = profiles?.every((p) => p.onboarding_completed);

 const cycleHistory = await loadCycleHistory(
 supabase,
 activeRelationship.id,
 activeRelationship.cycle_number ?? 1
 );

 const { data: latestCycleInsight } = await supabase
 .from("relationship_insights")
 .select("content")
 .eq("relationship_id", activeRelationship.id)
 .eq("insight_type", "cycle_analysis")
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 const latestCycleAnalysis = latestCycleInsight?.content as CycleAnalysis | undefined;

 return (
 <AppShell>
 <div className="space-y-8">
 <div>
 <h1 className="font-serif text-3xl font-semibold">Relationship insights</h1>
 <p className="mt-1 text-muted-foreground">
 Deep analysis for {connectionLabel} ({typeLabel}) - perception gaps, strengths, and growth areas
 </p>
 </div>

 {!analysis && bothOnboarded && (
 <Card className="border-primary/30 bg-primary/5">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-primary" />
 Begin deep analysis
 </CardTitle>
 <CardDescription>
 Both people have completed onboarding for this connection. Your guide will analyze your stories
 to reveal personalized insights.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <AnalyzeOnboardingButton
 relationshipId={activeRelationship.id}
 label="Begin deep analysis"
 />
 </CardContent>
 </Card>
 )}

 {!analysis && !bothOnboarded && (
 <Card>
 <CardContent className="py-16 text-center">
 <Lightbulb className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
 <p className="font-medium">Waiting for both people</p>
 <p className="mt-1 text-sm text-muted-foreground">
 Insights will appear once both people complete onboarding for this connection
 </p>
 </CardContent>
 </Card>
 )}

 {analysisInvalid && bothOnboarded && (
 <Card className="border-amber-500/30 bg-amber-500/5">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-amber-600" />
 Re-run deep analysis
 </CardTitle>
 <CardDescription>
 Your previous analysis did not include onboarding answers. We can repair
 saved responses and generate a real analysis.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <AnalyzeOnboardingButton
 relationshipId={activeRelationship.id}
 label="Re-run analysis with saved answers"
 replace
 />
 </CardContent>
 </Card>
 )}

 {analysis && !analysisInvalid && (
 <>
 {(cycleHistory.progressNarrative || latestCycleAnalysis?.progress_narrative) && (
 <Card className="border-primary/20 bg-primary/5">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-lg">
 <Sparkles className="h-5 w-5 text-primary" />
 Progress since Cycle 1
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm leading-relaxed text-muted-foreground">
 {latestCycleAnalysis?.progress_narrative || cycleHistory.progressNarrative}
 </p>
 </CardContent>
 </Card>
 )}

 {cycleHistory.completedCount > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Healing cycles</CardTitle>
 <CardDescription>
 {cycleHistory.completedCount} cycle{cycleHistory.completedCount === 1 ? "" : "s"}{" "}
 completed ·{" "}
 <a
 href={`/relationship/${activeRelationship.id}/cycles`}
 className="text-primary underline-offset-2 hover:underline"
 >
 View all cycles
 </a>
 </CardDescription>
 </CardHeader>
 <CardContent>
 <ThemeCoverageChart coveredThemes={cycleHistory.allThemesCovered} />
 </CardContent>
 </Card>
 )}

 <Card>
 <CardHeader>
 <CardDescription>Relationship health score</CardDescription>
 <CardTitle className="text-4xl">{analysis.health_score}/100</CardTitle>
 </CardHeader>
 <CardContent>
 <Progress value={analysis.health_score} className="h-3" />
 <p className="mt-4 leading-relaxed text-muted-foreground">{analysis.summary}</p>
 </CardContent>
 </Card>

 <div className="grid gap-4 sm:grid-cols-2">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-lg">
 <Heart className="h-5 w-5 text-primary" />
 Your strengths
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 {analysis.user_strengths.map((s) => (
 <Badge key={s} variant="success" className="mr-1">
 {s}
 </Badge>
 ))}
 </CardContent>
 </Card>
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-lg">
 <Target className="h-5 w-5" />
 Growth areas
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 {analysis.user_weaknesses.map((w) => (
 <Badge key={w} variant="warning" className="mr-1">
 {w}
 </Badge>
 ))}
 </CardContent>
 </Card>
 </div>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-amber-500" />
 Perception gaps
 </CardTitle>
 <CardDescription>
 Where how you see things differs from how your connection sees them
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {analysis.perception_gaps.map((gap) => (
 <div
 key={gap.area}
 className="rounded-xl border border-border/60 p-4"
 >
 <p className="font-medium">{gap.area}</p>
 <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
 <p>
 <span className="text-muted-foreground">You see: </span>
 {gap.self_view}
 </p>
 <p>
 <span className="text-muted-foreground">They see: </span>
 {gap.partner_view}
 </p>
 </div>
 <p className="mt-2 text-sm text-primary">{gap.gap_description}</p>
 </div>
 ))}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Alignment areas</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 {analysis.alignment_areas.map((a) => (
 <p key={a} className="flex items-center gap-2 text-sm">
 <span className="text-emerald-500">✓</span> {a}
 </p>
 ))}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Recommended focus</CardTitle>
 </CardHeader>
 <CardContent className="flex flex-wrap gap-2">
 {analysis.recommended_focus.map((f) => (
 <Badge key={f}>{f}</Badge>
 ))}
 </CardContent>
 </Card>
 </>
 )}
 </div>
 </AppShell>
 );
}
