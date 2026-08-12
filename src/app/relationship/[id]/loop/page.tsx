import { notFound, redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { HealingAnalysisPanel } from "@/components/healing-analysis-panel";
import { AppShell } from "@/components/app-shell";
import { HealingLoopActive } from "@/components/healing-loop-active";
import { HealingLoopPoller } from "@/components/healing-loop-poller";
import { RelationshipProgressSteps } from "@/components/relationship-progress-steps";
import { WaitingForPartnerPanel } from "@/components/waiting-for-partner-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCurrentUser,
  userHasAccessToRelationship,
} from "@/lib/auth-helpers";
import { getConnectionDisplayName, getPartnerFirstName } from "@/lib/partner-names";
import { loadRelationshipContext } from "@/lib/relationship-data";

export const dynamic = "force-dynamic";

export default async function HealingLoopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = await userHasAccessToRelationship(id, user.id);
  if (!hasAccess) notFound();

  const ctx = await loadRelationshipContext(user.id, id);
  if (!ctx.relationship) notFound();

  const partnerName = ctx.partner
    ? getPartnerFirstName(ctx.partner)
    : getConnectionDisplayName(ctx.relationship, null);

  if (ctx.phase === "waiting_for_partner") {
    return (
      <AppShell userName={ctx.profile?.name} healingLoopHref={`/relationship/${id}/loop`}>
        <div className="mx-auto max-w-2xl space-y-6">
          <LoopHeader partnerName={partnerName} />
          <WaitingForPartnerPanel
            relationshipId={id}
            inviteLink={ctx.inviteLink}
            partnerEmail={ctx.pendingInvite?.to_email}
          />
        </div>
      </AppShell>
    );
  }

  if (ctx.phase === "partner_needs_onboarding") {
    return (
      <AppShell userName={ctx.profile?.name} healingLoopHref={`/relationship/${id}/loop`}>
        <div className="mx-auto max-w-2xl space-y-6">
          <LoopHeader partnerName={partnerName} />
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader>
              <CardTitle>Partner accepted!</CardTitle>
              <CardDescription>
                {partnerName} has joined. Waiting for them to complete onboarding so your
                guide can analyze you both.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelationshipProgressSteps
                steps={[
                  { label: "You completed onboarding", done: true },
                  { label: "Partner joined", done: true },
                  { label: "Partner completes onboarding", done: false, active: true },
                  { label: "Deep analysis together", done: false },
                  { label: "Healing loop begins", done: false },
                ]}
              />
            </CardContent>
          </Card>
          <HealingLoopPoller relationshipId={id} />
        </div>
      </AppShell>
    );
  }

  if (ctx.phase === "ready_for_analysis") {
    return (
      <AppShell userName={ctx.profile?.name} healingLoopHref={`/relationship/${id}/loop`}>
        <div className="mx-auto max-w-2xl space-y-6">
          <LoopHeader partnerName={partnerName} />
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Ready to start your healing session
              </CardTitle>
              <CardDescription>
                Both you and {partnerName} have shared your stories. Aura & Anchor will
                analyze both perspectives and generate your first guided reflections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HealingAnalysisPanel
                relationshipId={id}
                redirectTo={`/relationship/${id}/loop`}
                label="Start healing session"
              />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userName={ctx.profile?.name} healingLoopHref={`/relationship/${id}/loop`}>
      <HealingLoopActive relationshipId={id} />
    </AppShell>
  );
}

function LoopHeader({ partnerName }: { partnerName: string }) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Healing loop with {partnerName}</h1>
    </div>
  );
}
