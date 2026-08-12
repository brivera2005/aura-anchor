import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PartnerSlotBanner } from "@/components/partner-slot-banner";
import { DashboardClient } from "@/components/dashboard-client";
import { getCurrentUser, getProfile } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);

  return (
    <AppShell userName={profile?.name}>
      <PartnerSlotBanner />
      <DashboardClient />
    </AppShell>
  );
}
