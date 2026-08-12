import { decrypt, hasEncryptionKey } from "./encryption";
import type { CycleAnalysis, OnboardingAnalysis } from "./types";

export type FeedEntryType =
 | "your_question"
 | "your_answer"
 | "partner_briefing"
 | "partner_answer"
 | "insight"
 | "cycle_analysis"
 | "milestone";

export interface FeedEntry {
 id: string;
 type: FeedEntryType;
 created_at: string;
 title?: string;
 body: string;
 meta?: {
 questionId?: string;
 partnerName?: string;
 isUnread?: boolean;
 briefingId?: string;
 healthScore?: number;
 cycleNumber?: number;
 cycleAnalysis?: CycleAnalysis;
 };
}

export interface HealingFeedSections {
 yourAnswers: FeedEntry[];
 partnerBriefings: FeedEntry[];
 cycleProgress: FeedEntry[];
}

interface QuestionRow {
 id: string;
 question_text: string;
 status: string;
 created_at: string;
 cycle_number?: number | null;
}

export interface CompletedCycleSummary {
 cycleNumber: number;
 title: string;
 summary: string;
 reportUrl: string;
 completedAt: string;
 cycleAnalysisAvailable: true;
}

export interface AnswerRow {
 id: string;
 encrypted_answer: string;
 created_at: string;
 question_id: string;
 ai_questions: { question_text: string } | { question_text: string }[] | null;
}

function questionTextFromJoin(
 joined: AnswerRow["ai_questions"]
): string | undefined {
 if (!joined) return undefined;
 if (Array.isArray(joined)) return joined[0]?.question_text;
 return joined.question_text;
}

interface BriefingRow {
 id: string;
 content: string;
 from_user_id: string;
 read_at: string | null;
 created_at: string;
}

interface MilestoneRow {
 id: string;
 title: string;
 description: string | null;
 achieved_at: string;
 milestone_key?: string;
}

interface InsightRow {
 id: string;
 insight_type: string;
 content: Record<string, unknown>;
 created_at: string;
}

/** Partner raw answers must NEVER appear in another user's feed. */
export function isPartnerRawAnswer(entry: FeedEntry): boolean {
 return entry.type === "partner_answer";
}

/** Strip or block entries that would expose partner verbatim text. */
export function filterFeedForPrivacy(entries: FeedEntry[]): FeedEntry[] {
 return entries.filter((e) => !isPartnerRawAnswer(e));
}

const COLLAPSED_MILESTONE_KEYS = new Set([
 "first_briefing",
 "first_answer",
 "onboarding_complete",
]);

const questionCycleById = (questions: QuestionRow[]) =>
 new Map(questions.map((q) => [q.id, q.cycle_number ?? null]));

export function buildHealingFeed(
 questions: QuestionRow[],
 answers: AnswerRow[],
 briefings: BriefingRow[],
 milestones: MilestoneRow[],
 insights: InsightRow[],
 partnerNames: Map<string, string>
): FeedEntry[] {
 const entries: FeedEntry[] = [];
 const cycleByQuestionId = questionCycleById(questions);

 // Only user's own answers - never partner verbatim text
 for (const a of answers) {
 let body = "Your answer";
 if (hasEncryptionKey()) {
 try {
 body = decrypt(a.encrypted_answer);
 } catch {
 body = "Your answer (unable to decrypt)";
 }
 }
 entries.push({
 id: `a-${a.id}`,
 type: "your_answer",
 created_at: a.created_at,
 title: questionTextFromJoin(a.ai_questions) || "Your reflection",
 body,
 meta: {
 questionId: a.question_id,
 cycleNumber: cycleByQuestionId.get(a.question_id) ?? undefined,
 },
 });
 }

 // Partner entries = guide briefings only (Why/What/How)
 for (const b of briefings) {
 const senderName = partnerNames.get(b.from_user_id) || "Partner";
 const firstName = senderName.split(/\s+/)[0];
 entries.push({
 id: `b-${b.id}`,
 type: "partner_briefing",
 created_at: b.created_at,
 title: `For you about ${firstName}`,
 body: b.content,
 meta: {
 partnerName: senderName,
 isUnread: !b.read_at,
 briefingId: b.id,
 },
 });
 }

 // Cycle analysis + onboarding insight in progress section
 for (const i of insights) {
 if (i.insight_type === "cycle_analysis") {
 const analysis = i.content as unknown as CycleAnalysis;
 entries.push({
 id: `ca-${i.id}`,
 type: "cycle_analysis",
 created_at: i.created_at,
 title: analysis.title || `Cycle ${analysis.cycle_number} - Deep Analysis`,
 body: analysis.summary || "",
 meta: {
 cycleNumber: analysis.cycle_number,
 cycleAnalysis: analysis,
 },
 });
 continue;
 }

 if (i.insight_type === "onboarding_analysis") {
 const analysis = i.content as unknown as OnboardingAnalysis;
 entries.push({
 id: `i-${i.id}`,
 type: "insight",
 created_at: i.created_at,
 title: "Relationship analysis",
 body: analysis.summary || "Your guide analyzed both partners' onboarding responses.",
 meta: { healthScore: analysis.health_score },
 });
 }
 }

 // Collapse redundant milestones - only show cycle completions
 for (const m of milestones) {
 if (m.milestone_key && COLLAPSED_MILESTONE_KEYS.has(m.milestone_key)) {
 continue;
 }
 if (m.milestone_key?.startsWith("cycle_") && m.milestone_key.endsWith("_complete")) {
 continue; // cycle_analysis card covers this
 }
 entries.push({
 id: `m-${m.id}`,
 type: "milestone",
 created_at: m.achieved_at,
 title: m.title,
 body: m.description || "Milestone reached",
 });
 }

 return filterFeedForPrivacy(entries).sort(
 (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 );
}

/** Split feed into UI sections: your answers, partner briefings, cycle progress. */
export function groupFeedIntoSections(entries: FeedEntry[]): HealingFeedSections {
 const filtered = filterFeedForPrivacy(entries);

 return {
 yourAnswers: filtered.filter((e) => e.type === "your_answer"),
 partnerBriefings: filtered.filter((e) => e.type === "partner_briefing"),
 cycleProgress: filtered.filter(
 (e) =>
 e.type === "cycle_analysis" ||
 e.type === "insight" ||
 e.type === "milestone"
 ),
 };
}
