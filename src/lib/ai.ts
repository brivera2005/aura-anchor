import OpenAI from "openai";
import {
 pickNextTheme,
 pickThemesForCycle,
 QUESTIONS_PER_CYCLE,
 THEME_LABELS,
 type HealingTheme,
} from "./healing-themes";
import {
 formatTemplatesForPrompt,
 getStructuredQuestion,
 resolveQuestion,
 validateHealingQuestion,
} from "./theme-questions";
import type {
 AnswerAnalysis,
 BriefingSections,
 CycleAnalysis,
 OnboardingAnalysis,
 PartnerNamesForAI,
 RelationshipSubtype,
 RelationshipType,
} from "./types";

function formatBriefing(sections: BriefingSections): string {
 return [
 `WHY this matters:\n${sections.why}`,
 `HOW to respond:\n${sections.how}`,
 `WHAT they need:\n${sections.what}`,
 ].join("\n\n");
}

export type AIProvider = "gemini" | "openai" | "mock";

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o-mini";

const SECOND_PERSON_RULES = `
CRITICAL QUESTION RULES:
- Address the answerer directly using "you" and "your" - NEVER third person about themselves.
- YES: "When you consider your communication style, what do you believe works best?"
- YES: "When you and Sarah disagree, how do you usually respond?"
- NO: "How does Ben describe his emotional needs?"
- NO: "What does Sarah believe about trust?"
- Use the partner's first name ONLY when referring to THE OTHER person: "When you and {partner} disagree..."
- You select and lightly adapt pre-written questions. Do NOT invent new question topics.
- Keep questions under 220 characters.
`.trim();

export function getGeminiApiKey(): string | null {
 const key =
 process.env.GOOGLE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
 return key || null;
}

export function getOpenAIApiKey(): string | null {
 const key = process.env.OPENAI_API_KEY?.trim();
 return key || null;
}

export function getAIProvider(): AIProvider {
 if (getGeminiApiKey()) return "gemini";
 if (getOpenAIApiKey()) return "openai";
 return "mock";
}

export function isMockAI(): boolean {
 return getAIProvider() === "mock";
}

function getOpenAI() {
 const apiKey = getOpenAIApiKey();
 if (!apiKey) return null;
 return new OpenAI({ apiKey });
}

async function callGeminiJSON(prompt: string, temperature = 0.7): Promise<string> {
 const apiKey = getGeminiApiKey();
 if (!apiKey) throw new Error("Gemini API key not configured");

 const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

 const response = await fetch(url, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "x-goog-api-key": apiKey,
 },
 body: JSON.stringify({
 contents: [{ parts: [{ text: prompt }] }],
 generationConfig: {
 responseMimeType: "application/json",
 temperature,
 },
 }),
 });

 if (!response.ok) {
 const errorText = await response.text();
 throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 300)}`);
 }

 const data = (await response.json()) as {
 candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
 };

 const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
 if (!text) throw new Error("No response from guide engine");
 return text;
}

async function callOpenAIJSON(prompt: string, temperature = 0.7): Promise<string> {
 const openai = getOpenAI();
 if (!openai) throw new Error("OpenAI API key not configured");

 const response = await openai.chat.completions.create({
 model: OPENAI_MODEL,
 messages: [{ role: "user", content: prompt }],
 response_format: { type: "json_object" },
 temperature,
 });

 const content = response.choices[0]?.message?.content;
 if (!content) throw new Error("No response from guide engine");
 return content;
}

async function callAIJSON(prompt: string, temperature = 0.7): Promise<string> {
 const provider = getAIProvider();
 const maxAttempts = provider === "gemini" ? 3 : 2;
 let lastError: unknown;

 for (let attempt = 1; attempt <= maxAttempts; attempt++) {
 try {
 if (provider === "gemini") return await callGeminiJSON(prompt, temperature);
 if (provider === "openai") return await callOpenAIJSON(prompt, temperature);
 throw new Error("Guide engine not configured");
 } catch (err) {
 lastError = err;
 const retryable =
 err instanceof Error &&
 (/5\d\d/.test(err.message) ||
 err.message.includes("No response") ||
 err.message.includes("fetch failed"));
 if (!retryable || attempt === maxAttempts) break;
 await new Promise((r) => setTimeout(r, attempt * 400));
 }
 }

 throw lastError instanceof Error ? lastError : new Error("Guide engine failed");
}

function parseAIJSON<T>(content: string): T {
 try {
 return JSON.parse(content) as T;
 } catch {
 const match = content.match(/\{[\s\S]*\}/);
 if (!match) throw new Error("AI returned invalid JSON");
 return JSON.parse(match[0]) as T;
 }
}

function summarizeResponses(responses: Record<string, string>): Record<string, string> {
 const trimmed: Record<string, string> = {};
 for (const [key, value] of Object.entries(responses)) {
 trimmed[key] = value.length > 500 ? `${value.slice(0, 500)}…` : value;
 }
 return trimmed;
}

function partnerFirstName(fullName: string): string {
 return fullName.split(/\s+/)[0] || fullName;
}

async function selectQuestionFromTemplates(
 theme: HealingTheme,
 partnerName: string,
 answererName: string,
 templateIndex: number,
 contextNote?: string,
 relationshipType?: RelationshipType,
 relationshipSubtype?: RelationshipSubtype | null
): Promise<string> {
 const partnerFirst = partnerFirstName(partnerName);
 const fallback = getStructuredQuestion(
 theme,
 partnerFirst,
 templateIndex,
 relationshipType,
 relationshipSubtype
 );

 if (isMockAI()) return fallback;

 const templates = formatTemplatesForPrompt(theme, partnerFirst);
 const prompt = `You select and lightly adapt a pre-written healing question. Do NOT invent new topics.

Theme: ${THEME_LABELS[theme]} (${theme})
Partner's first name (the OTHER person): ${partnerFirst}
${contextNote ? `Context: ${contextNote}` : ""}

Pre-written templates (pick one by index, adapt wording only if needed):
${templates}

${SECOND_PERSON_RULES}

Return JSON: {
 "template_index": number (0-${THEME_QUESTIONS_COUNT(theme) - 1}),
 "adapted_question": "lightly adapted version using you/your, or exact template if no change needed"
}`;

 try {
 const content = await callAIJSON(prompt, 0.4);
 const parsed = parseAIJSON<{ template_index?: number; adapted_question?: string }>(content);
 const idx =
 typeof parsed.template_index === "number" ? parsed.template_index : templateIndex;
 return resolveQuestion(
 theme,
 partnerFirst,
 idx,
 parsed.adapted_question,
 partnerFirstName(answererName),
 relationshipType,
 relationshipSubtype
 );
 } catch {
 return fallback;
 }
}

function THEME_QUESTIONS_COUNT(theme: HealingTheme): number {
 return 5;
}

export async function analyzeOnboarding(
 user1Responses: Record<string, string>,
 user2Responses: Record<string, string>,
 relationshipType: string,
 names: PartnerNamesForAI
): Promise<OnboardingAnalysis> {
 if (isMockAI()) {
 return getMockOnboardingAnalysis(user1Responses, user2Responses, relationshipType, names);
 }

 const prompt = `You are a compassionate relationship counselor. Analyze these onboarding responses for a ${relationshipType} relationship between ${names.user1Name} and ${names.user2Name}. Use ONLY the provided answers - do not say responses are missing. Refer to partners by name (${names.user1Name}, ${names.user2Name}), never "Partner A/B".

${names.user1Name}'s responses:
${JSON.stringify(summarizeResponses(user1Responses))}

${names.user2Name}'s responses:
${JSON.stringify(summarizeResponses(user2Responses))}

Return JSON:
{
 "health_score": number 0-100,
 "summary": "2-3 sentence overview grounded in their answers, using their names",
 "user_strengths": ["strength1", "strength2"],
 "user_weaknesses": ["weakness1"],
 "partner_strengths": ["strength1"],
 "partner_weaknesses": ["weakness1"],
 "perception_gaps": [{"area": "string", "self_view": "string", "partner_view": "string", "gap_description": "string"}],
 "alignment_areas": ["area1"],
 "recommended_focus": ["focus1", "focus2"]
}`;

 const content = await callAIJSON(prompt, 0.5);
 return parseAIJSON<OnboardingAnalysis>(content);
}

export async function generateInitialQuestions(
 analysis: OnboardingAnalysis,
 forUser: "user1" | "user2",
 names: PartnerNamesForAI,
 theme: HealingTheme
): Promise<string[]> {
 const answererName = forUser === "user1" ? names.user1Name : names.user2Name;
 const partnerName = forUser === "user1" ? names.user2Name : names.user1Name;
 const question = await selectQuestionFromTemplates(
 theme,
 partnerName,
 answererName,
 0,
 `Recommended focus: ${analysis.recommended_focus?.slice(0, 2).join(", ")}`
 );
 return [question];
}

/** One AI call for both partners - avoids Worker timeout from sequential requests. */
export async function generateInitialQuestionsForBoth(
 analysis: OnboardingAnalysis,
 names: PartnerNamesForAI,
 themes: HealingTheme[]
): Promise<{ user1: string[]; user2: string[] }> {
 const contextNote = `Recommended focus: ${analysis.recommended_focus?.slice(0, 2).join(", ")}. Summary: ${analysis.summary?.slice(0, 200)}`;

 const [user1Q, user2Q] = await Promise.all([
 selectQuestionFromTemplates(themes[0], names.user2Name, names.user1Name, 0, contextNote),
 selectQuestionFromTemplates(
 themes[1] || themes[0],
 names.user1Name,
 names.user2Name,
 0,
 contextNote
 ),
 ]);

 return { user1: [user1Q], user2: [user2Q] };
}

export interface ProcessAnswerContext {
 answererName: string;
 answererFirstName: string;
 partnerName: string;
 partnerFirstName: string;
 cycleNumber: number;
 questionNumberInCycle: number;
 theme: string;
 themesCovered: string[];
 prior_answers?: Array<{ question: string; answer: string }>;
 relationship_id?: string;
 relationshipType?: RelationshipType;
 questionsPerCycle?: number;
 intensityTier?: string;
 longitudinalPrefix?: string;
 questionContextNote?: string;
 relationshipSubtype?: RelationshipSubtype | null;
 [key: string]: unknown;
}

export async function processAnswer(
 question: string,
 answer: string,
 relationshipContext: ProcessAnswerContext
): Promise<AnswerAnalysis> {
 const nextTheme = pickNextTheme([
 ...relationshipContext.themesCovered,
 relationshipContext.theme,
 ]);
 const themeLabel = THEME_LABELS[nextTheme as HealingTheme] || nextTheme;
 const templateIndex = relationshipContext.questionNumberInCycle % 5;

 if (isMockAI()) {
 return getMockAnswerAnalysis(question, answer, relationshipContext, nextTheme, templateIndex);
 }

 const prompt = `You are a relationship healing guide. ${relationshipContext.answererName} just answered a reflection question.

Question (second person, to ${relationshipContext.answererName}): ${question}
${relationshipContext.answererName}'s answer: ${answer}

Cycle ${relationshipContext.cycleNumber}, question ${relationshipContext.questionNumberInCycle} of ${relationshipContext.questionsPerCycle ?? QUESTIONS_PER_CYCLE} this cycle.
Current theme: ${relationshipContext.theme}
Next question theme: ${themeLabel} (${nextTheme})

Partner names: ${relationshipContext.answererName} answered; briefing is for ${relationshipContext.partnerName}.

${relationshipContext.questionContextNote ? `Guide note: ${relationshipContext.questionContextNote}` : ""}

Context: ${JSON.stringify({
 prior_answers: relationshipContext.prior_answers?.slice(0, 3),
 themes_covered: relationshipContext.themesCovered,
 })}

Generate a structured briefing for ${relationshipContext.partnerName} about ${relationshipContext.answererName}'s share:
- WHY: why this answer matters emotionally and what it reveals. Paraphrase sensitively - NEVER quote their answer verbatim.
- HOW: specific, actionable ways ${relationshipContext.partnerName} can respond or show up
- WHAT: what ${relationshipContext.answererName} needs from ${relationshipContext.partnerName} right now

For the next question, select from these pre-written templates (index ${templateIndex} preferred):
${formatTemplatesForPrompt(nextTheme, relationshipContext.partnerFirstName)}

${SECOND_PERSON_RULES}

Return JSON:
{
 "briefing_sections": {
 "why": "string - refer to ${relationshipContext.answererName} by name, no verbatim quotes",
 "how": "string - guidance for ${relationshipContext.partnerName}",
 "what": "string"
 },
 "template_index": number,
 "adapted_question": "second-person question using you/your",
 "progress_note": "brief encouraging note mentioning cycle progress (${relationshipContext.questionNumberInCycle}/${relationshipContext.questionsPerCycle ?? QUESTIONS_PER_CYCLE})",
 "theme": "${nextTheme}",
 "milestone": null
}`;

 const content = await callAIJSON(prompt, 0.6);
 const parsed = parseAIJSON<{
 briefing_sections: BriefingSections;
 template_index?: number;
 adapted_question?: string;
 progress_note: string;
 theme?: string;
 milestone?: AnswerAnalysis["milestone"];
 }>(content);

 const followUp = resolveQuestion(
 nextTheme,
 relationshipContext.partnerFirstName,
 parsed.template_index ?? templateIndex,
 parsed.adapted_question,
 relationshipContext.answererFirstName,
 relationshipContext.relationshipType,
 relationshipContext.relationshipSubtype
 );

 return {
 briefing_sections: parsed.briefing_sections,
 briefing_for_partner: formatBriefing(parsed.briefing_sections),
 follow_up_question: followUp,
 progress_note: parsed.progress_note,
 theme: parsed.theme || nextTheme,
 milestone: parsed.milestone ?? undefined,
 };
}

export interface CycleAnalysisInput {
 cycleNumber: number;
 names: PartnerNamesForAI;
 themesThisCycle: string[];
 qaPairs: Array<{
 answererName: string;
 question: string;
 answer: string;
 theme: string;
 }>;
 onboardingSummary?: string;
 priorCycleSummaries?: string[];
 allThemesCovered?: string[];
 priorCycleAnalyses?: CycleAnalysis[];
}

export async function runCycleAnalysis(input: CycleAnalysisInput): Promise<CycleAnalysis> {
 if (isMockAI()) {
 return getMockCycleAnalysis(input);
 }

 const user1Answers = input.qaPairs.filter((q) => q.answererName === input.names.user1Name);
 const user2Answers = input.qaPairs.filter((q) => q.answererName === input.names.user2Name);

 const prompt = `You are an expert relationship counselor delivering a COMPREHENSIVE healing report after BOTH partners completed ${QUESTIONS_PER_CYCLE} guided reflections each (${QUESTIONS_PER_CYCLE * 2} total answers).

Partners: ${input.names.user1Name} (partner_a) and ${input.names.user2Name} (partner_b)
Cycle ${input.cycleNumber} complete.
Themes explored this cycle: ${input.themesThisCycle.map((t) => THEME_LABELS[t as HealingTheme] || t).join(", ")}

${input.names.user1Name}'s reflections:
${JSON.stringify(user1Answers.map((q) => ({ theme: q.theme, question: q.question, answer: q.answer.slice(0, 800) })))}

${input.names.user2Name}'s reflections:
${JSON.stringify(user2Answers.map((q) => ({ theme: q.theme, question: q.question, answer: q.answer.slice(0, 800) })))}

${input.onboardingSummary ? `Onboarding context: ${input.onboardingSummary}` : ""}
${input.priorCycleSummaries?.length ? `Prior cycles: ${input.priorCycleSummaries.join(" | ")}` : ""}
${input.allThemesCovered?.length ? `All themes explored so far (${input.allThemesCovered.length}/10): ${input.allThemesCovered.join(", ")}` : ""}

Write for BOTH partners to read together. Use their actual names. Synthesize themes - NEVER quote answers verbatim.
Be specific, warm, and actionable. Avoid generic filler. Each section needs real depth (3-5 sentences minimum for narrative sections).

Return JSON with ALL sections:
{
 "cycle_number": ${input.cycleNumber},
 "title": "Cycle ${input.cycleNumber} Complete - Your Healing Report",
 "summary": "2-3 sentence executive snapshot of where the relationship stands after this cycle",
 "where_you_stand_together": "relationship snapshot: emotional climate, momentum, trust level this cycle",
 "heard_from_partner_a": "synthesized themes from ${input.names.user1Name}'s 5 reflections - patterns, needs, fears, hopes (NOT verbatim quotes)",
 "heard_from_partner_b": "synthesized themes from ${input.names.user2Name}'s 5 reflections - patterns, needs, fears, hopes",
 "perception_gaps": [{
 "area": "specific topic",
 "partner_a_view": "${input.names.user1Name}'s likely perspective",
 "partner_b_view": "${input.names.user2Name}'s likely perspective",
 "gap_description": "where they see things differently",
 "whats_valid": "what both perspectives get right",
 "whats_an_issue": "what needs addressing without blame"
 }],
 "whats_working": ["specific strength 1", "strength 2", "strength 3"],
 "needs_attention": ["issue 1 without blame", "issue 2", "issue 3"],
 "why_it_matters": "root causes and emotional undercurrents - why these patterns exist and what they protect",
 "how_to_start_healing": "multi-paragraph roadmap: what to do first, how to approach hard topics, what to avoid",
 "joint_actions_this_week": ["specific joint action 1", "joint action 2", "joint action 3"],
 "partner_a_actions_this_week": ["${input.names.user1Name}-specific action 1", "action 2"],
 "partner_b_actions_this_week": ["${input.names.user2Name}-specific action 1", "action 2"],
 "conversation_starters": ["prompt 1 for in-person talk", "prompt 2", "prompt 3"],
 "next_cycle_preview": "what themes cycle ${input.cycleNumber + 1} will explore and why",
 "themes_covered": ${JSON.stringify(input.themesThisCycle)},
 "progress_narrative": "2-4 sentences plain-language trend since Cycle 1 - theme coverage, growth, action follow-through",
 "tracked_action_steps": ["top 3 joint actions from this cycle for follow-up next cycle"]
}`;

 const content = await callAIJSON(prompt, 0.6);
 const parsed = parseAIJSON<CycleAnalysis>(content);
 return normalizeCycleAnalysis(parsed, input);
}

export async function generateCycleStartQuestions(
 names: PartnerNamesForAI,
 cycleNumber: number,
 themes: HealingTheme[],
 priorAnalysisSummary?: string,
 extraContext?: string
): Promise<{ user1: string; user2: string }> {
 const contextNote = [
 priorAnalysisSummary
 ? `Prior cycle insight: ${priorAnalysisSummary.slice(0, 300)}.`
 : "",
 extraContext || "",
 `Cycle ${cycleNumber} starting.`,
 ]
 .filter(Boolean)
 .join(" ");

 const [user1, user2] = await Promise.all([
 selectQuestionFromTemplates(themes[0], names.user2Name, names.user1Name, 0, contextNote),
 selectQuestionFromTemplates(
 themes[1] || themes[0],
 names.user1Name,
 names.user2Name,
 0,
 contextNote
 ),
 ]);

 return { user1, user2 };
}

export { pickThemesForCycle, pickNextTheme, QUESTIONS_PER_CYCLE, validateHealingQuestion };

function getMockAnswerAnalysis(
 question: string,
 answer: string,
 ctx: ProcessAnswerContext,
 nextTheme: HealingTheme,
 templateIndex: number
): AnswerAnalysis {
 const sections: BriefingSections = {
 why: `${ctx.answererName} shared something meaningful about ${question.slice(0, 60).toLowerCase()}… This points to a deeper need for understanding that ${ctx.partnerName} can honor without judgment.`,
 how: `${ctx.partnerName}, acknowledge what ${ctx.answererName} shared without fixing or defending. Ask one gentle follow-up question. Offer physical or emotional presence.`,
 what: `${ctx.answererName} needs to feel safe being vulnerable with ${ctx.partnerName}. Show that their honesty won't be used against them.`,
 };
 return {
 briefing_sections: sections,
 briefing_for_partner: formatBriefing(sections),
 follow_up_question: getStructuredQuestion(
 nextTheme,
 ctx.partnerFirstName,
 templateIndex
 ),
 progress_note: `Question ${ctx.questionNumberInCycle} of ${QUESTIONS_PER_CYCLE} this cycle - you're building trust through honest sharing.`,
 theme: nextTheme,
 };
}

function getMockOnboardingAnalysis(
 user1: Record<string, string>,
 user2: Record<string, string>,
 relationshipType: string,
 names: PartnerNamesForAI
): OnboardingAnalysis {
 const helpAreas1 = user1.help_areas || "communication";
 const helpAreas2 = user2.help_areas || "trust";

 return {
 health_score: 62,
 summary: `${names.user1Name} and ${names.user2Name}'s ${relationshipType} relationship shows genuine care and willingness to grow. Both have identified meaningful areas for healing, with notable opportunities to bridge communication gaps.`,
 user_strengths: [
 user1.self_strengths?.slice(0, 80) || "Deep capacity for empathy",
 "Commitment to personal growth",
 ],
 user_weaknesses: [
 user1.self_weaknesses?.slice(0, 80) || "Difficulty expressing needs directly",
 ],
 partner_strengths: [
 user1.partner_strengths?.slice(0, 80) || "Steadfast loyalty",
 "Emotional resilience",
 ],
 partner_weaknesses: [
 user1.partner_weaknesses?.slice(0, 80) || "Tendency to withdraw under stress",
 ],
 perception_gaps: [
 {
 area: "Communication style",
 self_view: user1.self_strengths?.slice(0, 60) || `${names.user1Name} communicates openly`,
 partner_view: user2.partner_strengths?.slice(0, 60) || `${names.user2Name} listens well but doesn't always share`,
 gap_description: `${names.user1Name} may see themselves as more communicative than ${names.user2Name} experiences.`,
 },
 {
 area: "Primary need",
 self_view: `Focus on ${helpAreas1}`,
 partner_view: `Focus on ${helpAreas2}`,
 gap_description: `${names.user1Name} and ${names.user2Name} may be working on different aspects simultaneously.`,
 },
 ],
 alignment_areas: [
 "Both want the relationship to improve",
 "Shared commitment to the healing process",
 ],
 recommended_focus: ["Active listening", "Expressing needs without blame", "Building trust through consistency"],
 };
}

function normalizeCycleAnalysis(
 analysis: CycleAnalysis,
 input: CycleAnalysisInput
): CycleAnalysis {
 return {
 ...analysis,
 why: analysis.why_it_matters || analysis.why || "",
 what_each_needs: analysis.what_each_needs || {
 partner_a: analysis.heard_from_partner_a || "",
 partner_b: analysis.heard_from_partner_b || "",
 },
 how_to_improve: analysis.how_to_start_healing || analysis.how_to_improve || "",
 action_steps:
 analysis.joint_actions_this_week?.length
 ? analysis.joint_actions_this_week
 : analysis.action_steps || [],
 };
}

function getMockCycleAnalysis(input: CycleAnalysisInput): CycleAnalysis {
 const base: CycleAnalysis = {
 cycle_number: input.cycleNumber,
 title: `Cycle ${input.cycleNumber} Complete - Your Healing Report`,
 summary: `${input.names.user1Name} and ${input.names.user2Name} have each completed ${QUESTIONS_PER_CYCLE} reflections. Clear patterns are emerging that point toward deeper understanding and concrete next steps.`,
 where_you_stand_together: `You are building momentum together. ${input.names.user1Name} and ${input.names.user2Name} both invested honest energy this cycle - that matters. Trust is growing, but some topics still feel tender.`,
 heard_from_partner_a: `${input.names.user1Name} values being understood without judgment. Their reflections show a desire for consistent emotional presence and follow-through on small promises.`,
 heard_from_partner_b: `${input.names.user2Name} needs safety before vulnerability. Their reflections highlight processing time, fear of conflict escalation, and hope for gentler check-ins.`,
 perception_gaps: [
 {
 area: "Communication timing",
 partner_a_view: `${input.names.user1Name} wants to resolve issues quickly`,
 partner_b_view: `${input.names.user2Name} needs time to process first`,
 gap_description: "Different processing speeds create misunderstandings",
 whats_valid: "Both value resolution and care about the relationship",
 whats_an_issue: "Neither has agreed on a shared rhythm for hard conversations",
 },
 ],
 whats_working: [
 "Both partners showed up for all reflections",
 "Willingness to be honest about needs",
 "Shared commitment to healing",
 ],
 needs_attention: [
 "Timing mismatches during hard conversations",
 "Assumptions about intent when tone shifts",
 "Follow-through on small emotional promises",
 ],
 why_it_matters: `Both partners care deeply but express needs differently. ${input.names.user1Name} tends toward direct communication while ${input.names.user2Name} may need more processing time - neither is wrong, but the timing mismatch creates friction that can feel like rejection.`,
 how_to_start_healing: `Start with weekly check-ins using the briefing format. Practice reflecting back what you heard before offering solutions. Celebrate small wins explicitly. Agree on a pause signal when conversations heat up.`,
 joint_actions_this_week: [
 "Schedule a 20-minute check-in without phones",
 "Each name one thing appreciated about the other daily",
 "Read this report together and pick one action each",
 ],
 partner_a_actions_this_week: [
 `${input.names.user1Name}: Ask "Do you need space or support?" before problem-solving`,
 `${input.names.user1Name}: Share one feeling daily, even if small`,
 ],
 partner_b_actions_this_week: [
 `${input.names.user2Name}: Signal when you need processing time instead of withdrawing`,
 `${input.names.user2Name}: Offer one specific appreciation each day`,
 ],
 conversation_starters: [
 "What felt hardest to share this cycle, and what made it safe enough?",
 "Where do you think we misunderstand each other most?",
 "What's one small change that would help you feel more loved this week?",
 ],
 next_cycle_preview: `Cycle ${input.cycleNumber + 1} will explore trust patterns and how you repair after conflict - building on what you shared about communication timing.`,
 themes_covered: input.themesThisCycle,
 progress_narrative: `${input.names.user1Name} and ${input.names.user2Name} have completed ${input.cycleNumber} cycle${input.cycleNumber === 1 ? "" : "s"}. Themes explored are expanding, and both partners are showing up consistently. Action follow-through will be checked next cycle.`,
 };
 return normalizeCycleAnalysis(
 {
 ...base,
 tracked_action_steps: base.joint_actions_this_week?.slice(0, 3),
 },
 input
 );
}
