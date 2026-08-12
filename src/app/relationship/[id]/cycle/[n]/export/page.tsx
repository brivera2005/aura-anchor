import { notFound, redirect } from "next/navigation";
import { CycleReportExport } from "@/components/cycle-report-export";
import { getCurrentUser, userHasAccessToRelationship } from "@/lib/auth-helpers";
import { getDisplayName } from "@/lib/partner-names";
import type { CycleAnalysis } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CycleExportPage({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;
  const cycleNumber = parseInt(n, 10);
  if (!Number.isFinite(cycleNumber) || cycleNumber < 1) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = await userHasAccessToRelationship(id, user.id);
  if (!hasAccess) notFound();

  const supabase = await createClient();

  const { data: relationship } = await supabase
    .from("relationships")
    .select("*")
    .eq("id", id)
    .single();

  if (!relationship) notFound();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", [relationship.user1_id, relationship.user2_id!]);

  const user1Profile = profiles?.find((p) => p.user_id === relationship.user1_id);
  const user2Profile = profiles?.find((p) => p.user_id === relationship.user2_id);

  const { data: insightRows } = await supabase
    .from("relationship_insights")
    .select("content")
    .eq("relationship_id", id)
    .eq("insight_type", "cycle_analysis")
    .order("created_at", { ascending: false });

  const analysisRow = (insightRows || []).find(
    (row) => (row.content as CycleAnalysis).cycle_number === cycleNumber
  );

  if (!analysisRow) notFound();

  const analysis = analysisRow.content as CycleAnalysis;

  return (
    <CycleReportExport
      analysis={analysis}
      user1Name={getDisplayName(user1Profile ?? null, "Partner 1")}
      user2Name={getDisplayName(user2Profile ?? null, "Partner 2")}
      relationshipId={id}
    />
  );
}
