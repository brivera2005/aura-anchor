import { NextResponse } from "next/server";

import {

 analyzeOnboarding,

 generateInitialQuestionsForBoth,

 getAIProvider,

 isMockAI,

} from "@/lib/ai";

import { hasEncryptionKey } from "@/lib/encryption";

import {

 clearOnboardingAnalysisArtifacts,

 fetchPartnerOnboardingResponses,

 isEmptyDataAnalysis,

} from "@/lib/onboarding-responses";

import { isOnboardingCompleteForUser } from "@/lib/relationship-onboarding";
import { mergeDuplicateRelationships } from "@/lib/relationship-reconcile";

import { getQuickAnswersForQuestion } from "@/lib/quick-answers";

import { pickThemesForCycle } from "@/lib/healing-themes";

import { getDisplayName, getPartnerFirstName } from "@/lib/partner-names";

import { sendYourTurnEmail } from "@/lib/email/send-your-turn";

import { getAppUrl } from "@/lib/env";

import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

import { createClient } from "@/lib/supabase/server";



function formatAnalysisError(err: unknown): {

 error: string;

 code: string;

 status: number;

} {

 const message = err instanceof Error ? err.message : String(err);



 if (message.includes("Gemini API error")) {

 return {

 error: "AI guide is temporarily unavailable. Please try again in a moment.",

 code: "ai_error",

 status: 502,

 };

 }

 if (

 message.includes("invalid JSON") ||

 message.includes("Unexpected token") ||

 message.includes("JSON")

 ) {

 return {

 error: "AI returned an unreadable response. Please try again.",

 code: "ai_parse_error",

 status: 502,

 };

 }

 if (/timeout|timed out|aborted/i.test(message)) {

 return {

 error: "Analysis timed out. Please try again - your answers are saved.",

 code: "timeout",

 status: 504,

 };

 }

 if (message.includes("Failed to load onboarding")) {

 return { error: message, code: "onboarding_load_error", status: 500 };

 }



 return {

 error: message || "Analysis failed",

 code: "analysis_failed",

 status: 500,

 };

}



export async function POST(request: Request) {

 try {

 if (!hasEncryptionKey()) {

 return NextResponse.json(

 { error: "Encryption not configured on server" },

 { status: 500 }

 );

 }



 const supabase = await createClient();

 const {

 data: { user },

 } = await supabase.auth.getUser();



 if (!user) {

 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 }



 const { relationshipId, replace } = await request.json();

 if (!relationshipId) {

 return NextResponse.json({ error: "Missing relationshipId" }, { status: 400 });

 }



 if (hasAdminClient()) {

 await mergeDuplicateRelationships(createAdminClient(), user.id);

 }



 const { data: relationship } = await supabase

 .from("relationships")

 .select("*")

 .eq("id", relationshipId)

 .single();



 if (!relationship || relationship.status !== "active") {

 return NextResponse.json(

 { error: "Relationship not active. Refresh your dashboard and try again." },

 { status: 400 }

 );

 }



 if (

 user.id !== relationship.user1_id &&

 user.id !== relationship.user2_id

 ) {

 return NextResponse.json({ error: "Forbidden" }, { status: 403 });

 }



 if (!relationship.user2_id) {

 return NextResponse.json({ error: "Partner not linked yet" }, { status: 400 });

 }



 const { data: existingInsight } = await supabase

 .from("relationship_insights")

 .select("id, content")

 .eq("relationship_id", relationshipId)

 .eq("insight_type", "onboarding_analysis")

 .order("created_at", { ascending: false })

 .limit(1)

 .maybeSingle();



 if (

 existingInsight &&

 !replace &&

 !isEmptyDataAnalysis(

 (existingInsight.content as { summary?: string } | null)?.summary

 )

 ) {

 return NextResponse.json({

 success: true,

 alreadyExists: true,

 message: "Analysis already complete",

 });

 }



 const { data: profiles } = await supabase

 .from("profiles")

 .select("*")

 .in("user_id", [relationship.user1_id, relationship.user2_id]);



 const user1Onboarded = await isOnboardingCompleteForUser(
 supabase,
 relationship.user1_id,
 relationshipId
 );
 const user2Onboarded = relationship.user2_id
 ? await isOnboardingCompleteForUser(supabase, relationship.user2_id, relationshipId)
 : false;

 if (!user1Onboarded || !user2Onboarded) {
 return NextResponse.json(
 { error: "Both people must complete onboarding for this connection first" },
 { status: 400 }
 );
 }



 const { user1Responses, user2Responses, user1Count, user2Count } =

 await fetchPartnerOnboardingResponses(

 relationshipId,

 relationship.user1_id,

 relationship.user2_id,

 supabase

 );



 if (user1Count === 0 && user2Count === 0) {

 return NextResponse.json(

 {

 error:

 "No onboarding responses found. Both partners should complete onboarding again from the dashboard.",

 code: "no_onboarding_data",

 user1Count,

 user2Count,

 },

 { status: 422 }

 );

 }



 if (user1Count === 0 || user2Count === 0) {

 const missing = user1Count === 0 ? "one partner" : "the other partner";

 return NextResponse.json(

 {

 error: `Onboarding answers are missing for ${missing}. Ask them to complete onboarding again.`,

 code: "incomplete_onboarding_data",

 user1Count,

 user2Count,

 },

 { status: 422 }

 );

 }



 if (replace || isEmptyDataAnalysis((existingInsight?.content as { summary?: string })?.summary)) {

 await clearOnboardingAnalysisArtifacts(supabase, relationshipId);

 }



 const user1Profile = profiles?.find((p) => p.user_id === relationship.user1_id);

 const user2Profile = profiles?.find((p) => p.user_id === relationship.user2_id);

 const partnerNames = {

 user1Name: getDisplayName(user1Profile, "Partner 1"),

 user2Name: getDisplayName(user2Profile, "Partner 2"),

 };



 const analysis = await analyzeOnboarding(

 user1Responses,

 user2Responses,

 relationship.type,

 partnerNames

 );



 if (isEmptyDataAnalysis(analysis.summary)) {

 return NextResponse.json(

 {

 error:

 "Analysis could not use your saved onboarding answers. Please complete onboarding again, then retry.",

 code: "analysis_rejected",

 },

 { status: 422 }

 );

 }



 await supabase.from("relationship_insights").insert({

 relationship_id: relationshipId,

 insight_type: "onboarding_analysis",

 content: analysis,

 });



 const cycleThemes = pickThemesForCycle([]);



 await supabase

 .from("relationships")

 .update({

 cycle_number: 1,

 questions_answered_this_cycle: 0,

 partner_answers_this_cycle: {},

 themes_covered: [],

 })

 .eq("id", relationshipId);



 const { user1: user1Questions, user2: user2Questions } =

 await generateInitialQuestionsForBoth(analysis, partnerNames, cycleThemes);



 const questionPairs = [

 [relationship.user1_id, user1Questions[0], cycleThemes[0]] as const,

 [relationship.user2_id, user2Questions[0], cycleThemes[1] || cycleThemes[0]] as const,

 ];



 for (const [userId, questionText, theme] of questionPairs) {

 if (!questionText) continue;

 const bubbleSuggestions = getQuickAnswersForQuestion(
 questionText,
 theme,
 0
 );

 await supabase.from("ai_questions").insert({

 relationship_id: relationshipId,

 for_user_id: userId,

 question_text: questionText,

 cycle_number: 1,

 theme,

 context: {

 source: "onboarding_analysis",

 analysis_summary: analysis.summary,

 bubble_suggestions: bubbleSuggestions.suggestions,

 cycle_number: 1,

 question_number: 1,

 template_index: 0,

 },

 status: "pending",

 });

 const profile = userId === relationship.user1_id ? user1Profile : user2Profile;

 const partnerProfile = userId === relationship.user1_id ? user2Profile : user1Profile;

 if (profile?.email) {
 const appUrl = getAppUrl();

 sendYourTurnEmail({

 toEmail: profile.email,

 recipientName: getDisplayName(profile),

 partnerName: getPartnerFirstName(partnerProfile),

 loopUrl: `${appUrl}/relationship/${relationshipId}/loop`,

 cycleNumber: 1,

 questionNumber: 1,

 }).catch((err) => console.error("Your-turn email failed:", err));

 }

 }



 await supabase.from("healing_milestones").upsert(

 {

 relationship_id: relationshipId,

 milestone_key: "onboarding_complete",

 title: "Foundation Set",

 description: "Both partners completed onboarding - deep analysis is ready",

 },

 { onConflict: "relationship_id,milestone_key" }

 );



 return NextResponse.json({

 success: true,

 analysis,

 user1Count,

 user2Count,

 });

 } catch (err) {

 console.error("Analyze onboarding error:", err);

 const formatted = formatAnalysisError(err);

 return NextResponse.json(

 { error: formatted.error, code: formatted.code },

 { status: formatted.status }

 );

 }

}



export async function GET() {

 return NextResponse.json({ mock: isMockAI(), provider: getAIProvider() });

}

