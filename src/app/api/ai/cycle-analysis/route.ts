import { NextResponse } from "next/server";
import { completeCycleIfReady } from "@/lib/healing-cycle";
import {
 isCycleReadyForAnalysis,
 resolvePartnerCycleCounts,
} from "@/lib/cycle-progress";
import { hasEncryptionKey } from "@/lib/encryption";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
 try {
 if (!hasEncryptionKey()) {
 return NextResponse.json({ error: "Encryption not configured" }, { status: 500 });
 }

 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { relationshipId } = await request.json();
 if (!relationshipId) {
 return NextResponse.json({ error: "Missing relationshipId" }, { status: 400 });
 }

 const { data: relationship } = await supabase
 .from("relationships")
 .select("*")
 .eq("id", relationshipId)
 .single();

 if (!relationship || relationship.status !== "active") {
 return NextResponse.json({ error: "Relationship not active" }, { status: 400 });
 }

 if (user.id !== relationship.user1_id && user.id !== relationship.user2_id) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const { data: profiles } = await supabase
 .from("profiles")
 .select("*")
 .in("user_id", [relationship.user1_id, relationship.user2_id!]);

 const user1Profile = profiles?.find((p) => p.user_id === relationship.user1_id) || null;
 const user2Profile = profiles?.find((p) => p.user_id === relationship.user2_id) || null;

 const analysis = await completeCycleIfReady(
 supabase,
 relationship,
 user1Profile,
 user2Profile
 );

 if (!analysis) {
 const partnerAnswers = await resolvePartnerCycleCounts(supabase, relationship);
 const totalAnswers = Object.values(partnerAnswers).reduce((a, b) => a + b, 0);
 return NextResponse.json({
 success: false,
 message: "Cycle not yet complete - both partners need 5 reflections each",
 partnerAnswers,
 questionsAnswered: totalAnswers,
 ready: isCycleReadyForAnalysis({ ...relationship, partner_answers_this_cycle: partnerAnswers }),
 });
 }

 return NextResponse.json({ success: true, analysis });
 } catch (err) {
 console.error("Cycle analysis error:", err);
 return NextResponse.json({ error: "Failed to run cycle analysis" }, { status: 500 });
 }
}
