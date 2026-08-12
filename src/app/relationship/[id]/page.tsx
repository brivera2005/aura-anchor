import { redirect } from "next/navigation";
import { getCurrentUser, userHasAccessToRelationship } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function RelationshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = await userHasAccessToRelationship(id, user.id);
  if (!hasAccess) redirect("/dashboard");

  redirect(`/relationship/${id}/loop`);
}
