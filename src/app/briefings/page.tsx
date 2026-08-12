import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Heart, MailOpen } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RelationshipParamRedirect } from "@/components/relationship-param-redirect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkBriefingRead } from "@/components/mark-briefing-read";
import { BriefingContent } from "@/components/briefing-content";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getConnectionDisplayName } from "@/lib/partner-names";
import { getRelationshipLabel } from "@/lib/relationship-types";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BriefingsPage({
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

 const { data: relationship } = await supabase
 .from("relationships")
 .select("*")
 .eq("id", relationshipId)
 .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
 .single();

 if (!relationship) {
 redirect("/dashboard");
 }

 const loopHref = `/relationship/${relationshipId}/loop`;

 const { data: briefings } = await supabase
 .from("briefings")
 .select("*")
 .eq("for_user_id", user.id)
 .eq("relationship_id", relationshipId)
 .order("created_at", { ascending: false });

 const enriched = await Promise.all(
 (briefings || []).map(async (b) => {
 const { data: profile } = await supabase
 .from("profiles")
 .select("name")
 .eq("user_id", b.from_user_id)
 .single();
 return { ...b, senderName: profile?.name || "Partner" };
 })
 );

 const connectionLabel = getConnectionDisplayName(relationship, null);
 const typeLabel = getRelationshipLabel(
 relationship.type,
 relationship.relationship_subtype
 );

 return (
 <AppShell>
 <div className="space-y-8">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h1 className="font-serif text-3xl font-semibold">Partner briefings</h1>
 <p className="mt-1 text-muted-foreground">
 Guide-translated insights about {connectionLabel} ({typeLabel}) - never their raw answers
 </p>
 </div>
 <Button variant="outline" size="sm" asChild>
 <Link href={loopHref}>
 View healing loop
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </div>

 {enriched.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center py-16 text-center">
 <MailOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
 <p className="font-medium">No briefings yet</p>
 <p className="mt-1 text-sm text-muted-foreground">
 When your connection answers, you&apos;ll receive Why / What / How briefings - never their verbatim words
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-4">
 {enriched.map((briefing) => (
 <Card
 key={briefing.id}
 className={!briefing.read_at ? "border-primary/30 bg-primary/5" : ""}
 >
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="flex items-center gap-2 text-lg">
 <Heart className="h-4 w-4 text-primary" />
 About {briefing.senderName.split(/\s+/)[0]}&apos;s share
 </CardTitle>
 {!briefing.read_at && <Badge>New</Badge>}
 </div>
 <CardDescription>{formatDate(briefing.created_at)}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <BriefingContent content={briefing.content} />
 {!briefing.read_at && (
 <MarkBriefingRead briefingId={briefing.id} />
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 </AppShell>
 );
}
