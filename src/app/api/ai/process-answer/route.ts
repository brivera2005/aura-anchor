import { NextResponse } from "next/server";
import { processAnswer } from "@/lib/ai";
import { getQuestionsPerCycle } from "@/lib/cycle-config";
import {
 completeCycleIfReady,
} from "@/lib/healing-cycle";
import {
 buildPartnerAnswersUpdate,
 resolvePartnerCycleCounts,
} from "@/lib/cycle-progress";
import { sendYourTurnEmail } from "@/lib/email/send-your-turn";
import { getAppUrl } from "@/lib/env";
import { decrypt, encrypt, hasEncryptionKey } from "@/lib/encryption";
import { buildPartnerNameContext } from "@/lib/partner-names";
import { getQuickAnswersForQuestion } from "@/lib/quick-answers";
import { collectThemesFromMemory, getIntensityTier, getLongitudinalPrefix } from "@/lib/theme-memory";
import { buildQuestionContextNote } from "@/lib/theme-questions";
import { createClient } from "@/lib/supabase/server";
import type { CycleAnalysis } from "@/lib/types";

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

 const { questionId, answer } = await request.json();
 if (!questionId || !answer?.trim()) {
 return NextResponse.json({ error: "Missing fields" }, { status: 400 });
 }

 const { data: question } = await supabase
 .from("ai_questions")
 .select("*")
 .eq("id", questionId)
 .eq("for_user_id", user.id)
 .eq("status", "pending")
 .single();

 if (!question) {
 return NextResponse.json({ error: "Question not found" }, { status: 404 });
 }

 const { data: relationship } = await supabase
 .from("relationships")
 .select("*")
 .eq("id", question.relationship_id)
 .single();

 if (!relationship) {
 return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
 }

 const partnerId =
 relationship.user1_id === user.id
 ? relationship.user2_id
 : relationship.user1_id;

 if (!partnerId) {
 return NextResponse.json({ error: "Partner not linked" }, { status: 400 });
 }

 const { data: profiles } = await supabase
 .from("profiles")
 .select("*")
 .in("user_id", [user.id, partnerId]);

 const answererProfile = profiles?.find((p) => p.user_id === user.id) || null;
 const partnerProfile = profiles?.find((p) => p.user_id === partnerId) || null;
 const names = buildPartnerNameContext(answererProfile, partnerProfile);

 const cycleNumber = relationship.cycle_number ?? 1;
 const questionsPerCycle = getQuestionsPerCycle(relationship.cycle_mode);
 const progressBefore = await resolvePartnerCycleCounts(supabase, relationship);
 const partnerCountBefore = partnerId ? progressBefore[partnerId] ?? 0 : 0;
 const myCountBefore = progressBefore[user.id] ?? 0;
 const myAnswerCount = myCountBefore + 1;
 const partnerAnswers = buildPartnerAnswersUpdate(progressBefore, user.id, myAnswerCount);
 const partnerCountAfter = partnerId ? partnerAnswers[partnerId] ?? 0 : 0;

 const themesCovered = (relationship.themes_covered as string[]) || [];
 const currentTheme = question.theme || "emotional_needs";
 const encryptedAnswer = encrypt(answer.trim());

 const { data: savedAnswer, error: answerError } = await supabase
 .from("user_answers")
 .insert({
 question_id: questionId,
 user_id: user.id,
 encrypted_answer: encryptedAnswer,
 })
 .select()
 .single();

 if (answerError) {
 return NextResponse.json({ error: answerError.message }, { status: 500 });
 }

 await supabase
 .from("ai_questions")
 .update({ status: "answered" })
 .eq("id", questionId);

 const updatedThemes = [...new Set([...themesCovered, currentTheme])];
 const totalAnswersThisCycle = myAnswerCount + partnerCountAfter;

 const { error: relationshipUpdateError } = await supabase
 .from("relationships")
 .update({
 partner_answers_this_cycle: partnerAnswers,
 questions_answered_this_cycle: totalAnswersThisCycle,
 themes_covered: updatedThemes,
 })
 .eq("id", question.relationship_id);

 if (relationshipUpdateError?.message?.includes("partner_answers_this_cycle")) {
 await supabase
 .from("relationships")
 .update({
 questions_answered_this_cycle: totalAnswersThisCycle,
 themes_covered: updatedThemes,
 })
 .eq("id", question.relationship_id);
 }

 const { data: priorAnswers } = await supabase
 .from("user_answers")
 .select("encrypted_answer, ai_questions(question_text)")
 .eq("user_id", user.id)
 .neq("question_id", questionId)
 .order("created_at", { ascending: false })
 .limit(5);

 const priorContext = (priorAnswers || []).map((a) => {
 const raw = a.ai_questions;
 const q = (Array.isArray(raw) ? raw[0] : raw) as { question_text: string } | null;
 let answerText = "";
 try {
 answerText = decrypt(a.encrypted_answer);
 } catch {
 answerText = "[encrypted]";
 }
 return {
 question: q?.question_text || "Previous question",
 answer: answerText.slice(0, 500),
 };
 });

 const { data: priorCycleInsights } = await supabase
 .from("relationship_insights")
 .select("content")
 .eq("relationship_id", question.relationship_id)
 .eq("insight_type", "cycle_analysis")
 .order("created_at", { ascending: true });

 const cycleRecords = (priorCycleInsights || []).map((row) => {
 const c = row.content as CycleAnalysis;
 return { cycleNumber: c.cycle_number, themes: c.themes_covered || [] };
 });
 const allThemesUsed = collectThemesFromMemory(cycleRecords, updatedThemes);

 const priorCycleForContext = (priorCycleInsights || [])
 .map((r) => r.content as CycleAnalysis)
 .find((c) => c.cycle_number === cycleNumber - 1);

 const enrichedContext = {
 ...((question.context as Record<string, unknown>) || {}),
 prior_answers: priorContext,
 relationship_id: question.relationship_id,
 relationshipType: relationship.type,
 relationshipSubtype: relationship.relationship_subtype,
 answererName: names.answererName,
 answererFirstName: names.answererFirstName,
 partnerName: names.partnerName,
 partnerFirstName: names.partnerFirstName,
 cycleNumber,
 questionNumberInCycle: myAnswerCount,
 questionsPerCycle,
 theme: currentTheme,
 themesCovered: allThemesUsed,
 intensityTier: getIntensityTier(cycleNumber),
 longitudinalPrefix: getLongitudinalPrefix(cycleNumber, priorCycleForContext?.summary),
 questionContextNote: buildQuestionContextNote({
 cycleNumber,
 intensityTier: getIntensityTier(cycleNumber),
 longitudinalPrefix: getLongitudinalPrefix(cycleNumber, priorCycleForContext?.summary),
 }),
 };

 const analysis = await processAnswer(
 question.question_text,
 answer.trim(),
 enrichedContext
 );

 const { count: partnerBriefingsBefore } = await supabase
 .from("briefings")
 .select("*", { count: "exact", head: true })
 .eq("for_user_id", partnerId);

 await supabase.from("briefings").insert({
 relationship_id: question.relationship_id,
 for_user_id: partnerId,
 from_user_id: user.id,
 content: analysis.briefing_for_partner,
 related_answer_id: savedAnswer.id,
 });

 const myCycleComplete = myAnswerCount >= questionsPerCycle;
 const bothComplete =
 myAnswerCount >= questionsPerCycle &&
 partnerCountAfter >= questionsPerCycle;

 let nextQuestionId: string | undefined;
 let cycleAnalysisTriggered = false;

 if (!myCycleComplete) {
 const followUpTheme = analysis.theme || currentTheme;
 const templateIndex = myAnswerCount;
 const followUpSuggestions = getQuickAnswersForQuestion(
 analysis.follow_up_question,
 followUpTheme,
 templateIndex
 );

 const { data: inserted } = await supabase
 .from("ai_questions")
 .insert({
 relationship_id: question.relationship_id,
 for_user_id: user.id,
 question_text: analysis.follow_up_question,
 cycle_number: cycleNumber,
 theme: analysis.theme || currentTheme,
 context: {
 previous_question: question.question_text,
 progress_note: analysis.progress_note,
 bubble_suggestions: followUpSuggestions.suggestions,
 cycle_number: cycleNumber,
 question_number: myAnswerCount + 1,
 template_index: templateIndex,
 },
 status: "pending",
 })
 .select("id")
 .single();

 nextQuestionId = inserted?.id;

 const { data: answererProfile } = await supabase
 .from("profiles")
 .select("email, name")
 .eq("user_id", user.id)
 .single();

 if (answererProfile?.email) {
 const appUrl = getAppUrl();
 sendYourTurnEmail({
 toEmail: answererProfile.email,
 recipientName: names.answererName,
 partnerName: names.partnerFirstName,
 loopUrl: `${appUrl}/relationship/${question.relationship_id}/loop`,
 cycleNumber,
 questionNumber: myAnswerCount + 1,
 questionsPerCycle,
 }).catch((err) => console.error("Your-turn email failed:", err));
 }
 } else if (bothComplete) {
 const updatedRelationship = {
 ...relationship,
 partner_answers_this_cycle: partnerAnswers,
 questions_answered_this_cycle: totalAnswersThisCycle,
 themes_covered: updatedThemes,
 cycle_number: cycleNumber,
 };

 const user1Profile =
 user.id === relationship.user1_id ? answererProfile : partnerProfile;
 const user2Profile =
 user.id === relationship.user2_id ? answererProfile : partnerProfile;

 await completeCycleIfReady(
 supabase,
 updatedRelationship,
 user1Profile,
 user2Profile
 );
 cycleAnalysisTriggered = true;
 }

 const { count: answerCount } = await supabase
 .from("user_answers")
 .select("*", { count: "exact", head: true })
 .eq("user_id", user.id);

 const milestones = [];
 if ((partnerBriefingsBefore || 0) === 0) {
 milestones.push({
 relationship_id: question.relationship_id,
 milestone_key: "first_briefing",
 title: "Bridge Builder",
 description: `First insight about ${names.answererName} delivered to ${names.partnerName}`,
 });
 }
 if (answerCount === 1) {
 milestones.push({
 relationship_id: question.relationship_id,
 milestone_key: "first_answer",
 title: "First Step",
 description: "Completed your first healing question",
 });
 }
 if (cycleAnalysisTriggered) {
 milestones.push({
 relationship_id: question.relationship_id,
 milestone_key: `cycle_${cycleNumber}_complete`,
 title: `Cycle ${cycleNumber} Complete - Healing Report`,
 description: `Comprehensive report ready for ${names.answererName} and ${names.partnerName}`,
 });
 }
 if (analysis.milestone) {
 milestones.push({
 relationship_id: question.relationship_id,
 milestone_key: analysis.milestone.key,
 title: analysis.milestone.title,
 description: analysis.milestone.description,
 });
 }

 for (const m of milestones) {
 await supabase
 .from("healing_milestones")
 .upsert(m, { onConflict: "relationship_id,milestone_key" });
 }

 if (!nextQuestionId && !myCycleComplete) {
 const { data: newQuestion } = await supabase
 .from("ai_questions")
 .select("id")
 .eq("relationship_id", question.relationship_id)
 .eq("for_user_id", user.id)
 .eq("status", "pending")
 .order("created_at", { ascending: false })
 .limit(1)
 .single();

 nextQuestionId = newQuestion?.id;
 }

 let progressNote = analysis.progress_note;
 if (myCycleComplete && !bothComplete) {
 progressNote = `You've completed your ${questionsPerCycle} reflections! Waiting for ${names.partnerFirstName} to finish theirs (${partnerCountAfter}/${questionsPerCycle}).`;
 } else if (cycleAnalysisTriggered) {
 progressNote = `Cycle ${cycleNumber} complete! Your comprehensive healing report is ready for you and ${names.partnerName}.`;
 }

 return NextResponse.json({
 success: true,
 progressNote,
 nextQuestionId: myCycleComplete ? undefined : nextQuestionId,
 relationshipId: question.relationship_id,
 cycleComplete: cycleAnalysisTriggered,
 waitingForPartner: myCycleComplete && !bothComplete,
 cycleNumber,
 questionNumberInCycle: myAnswerCount,
 myAnswersThisCycle: myAnswerCount,
 partnerAnswersThisCycle: partnerCountAfter,
 partnerName: names.partnerFirstName,
 });
 } catch (err) {
 console.error("Process answer error:", err);
 return NextResponse.json({ error: "Failed to process answer" }, { status: 500 });
 }
}
