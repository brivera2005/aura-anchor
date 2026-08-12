import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CyclesPageClient } from "@/components/cycles-page-client";
import { getCurrentUser, userHasAccessToRelationship } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CyclesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = await userHasAccessToRelationship(id, user.id);
  if (!hasAccess) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", user.id)
    .single();

  return (
    <AppShell userName={profile?.name}>
      <CyclesPageClient relationshipId={id} />
    </AppShell>
  );
}
