import type { HealingTheme } from "./healing-themes";
import { getRelationshipReference } from "./relationship-types";
import type { RelationshipSubtype, RelationshipType } from "./types";

/** Proven second-person question templates. Use {partner} for the other person's first name. */
export const THEME_QUESTIONS: Record<HealingTheme, string[]> = {
 communication_styles: [
 "When you and {partner} disagree, what do you usually do first?",
 "How do you feel when {partner} shuts down during a conversation?",
 "What do you wish {partner} understood about how you prefer to communicate?",
 "When you need to bring up something difficult, how do you usually start?",
 "What helps you feel heard when you and {partner} are talking through a problem?",
 ],
 emotional_needs: [
 "What do you need most emotionally from {partner} right now?",
 "When you feel low, how do you want {partner} to show up for you?",
 "What emotional need of yours do you think {partner} might not fully see?",
 "How do you usually tell {partner} when something is weighing on you?",
 "What makes you feel emotionally safe with {partner}?",
 ],
 trust_security: [
 "What helps you feel safe and secure in your relationship with {partner}?",
 "When trust feels shaky, what do you tend to do?",
 "What has {partner} done that strengthened your trust in them?",
 "What would help you feel more secure with {partner} going forward?",
 "How do you rebuild trust after you and {partner} have been hurt?",
 ],
 intimacy: [
 "What do you feel is working well between you and {partner} emotionally or physically?",
 "What kind of closeness do you miss or want more of with {partner}?",
 "How do you usually initiate connection with {partner}?",
 "What gets in the way of you feeling close to {partner}?",
 "When you feel most connected to {partner}, what is happening?",
 ],
 conflict_patterns: [
 "When tension rises between you and {partner}, what pattern do you notice in yourself?",
 "What do you typically do when you feel criticized by {partner}?",
 "How do you want conflicts with {partner} to go differently?",
 "What triggers you most often in disagreements with {partner}?",
 "After a fight with {partner}, what do you need to repair?",
 ],
 appreciation_gratitude: [
 "How do you feel most appreciated by {partner}?",
 "What is something {partner} does that you are grateful for but rarely say?",
 "How do you show {partner} that you appreciate them?",
 "What appreciation from {partner} would mean the most to you right now?",
 "When did you last feel truly seen by {partner}, and what happened?",
 ],
 future_vision: [
 "What does a healed future look like to you with {partner}?",
 "What is one change you hope you and {partner} make together?",
 "What are you most hopeful about in your relationship with {partner}?",
 "What fear do you have about where things are headed with {partner}?",
 "What would you want {partner} to know about the future you are trying to build?",
 ],
 family_parenting: [
 "How do family or parenting dynamics affect your relationship with {partner}?",
 "What role do you want {partner} to play in family decisions?",
 "When family stress hits, how do you and {partner} usually respond?",
 "What family pattern from your past shows up with {partner}?",
 "What do you need from {partner} when family pressures are high?",
 ],
 stress_external: [
 "What outside pressures are weighing on your relationship with {partner} most?",
 "How does stress from work or life change how you show up with {partner}?",
 "What do you need from {partner} when you are overwhelmed externally?",
 "How do you and {partner} support each other under outside pressure?",
 "What external stress do you think {partner} might not realize affects you?",
 ],
 love_languages: [
 "How do you feel most loved by {partner}?",
 "How do you usually show love to {partner}?",
 "What loving gesture from {partner} would mean the most to you right now?",
 "When you feel distant from {partner}, what kind of love do you crave?",
 "What is one way you wish {partner} would express love more often?",
 ],
};

/** Phrase-level quick-answer chips aligned by template index within each theme. */
export const THEME_BUBBLE_SUGGESTIONS: Record<HealingTheme, string[][]> = {
 communication_styles: [
 [
 "I tend to shut down when things get heated",
 "I need time to cool off before talking",
 "I want to be heard before offering solutions",
 "I usually try to fix the problem right away",
 "I walk away until I can speak calmly",
 "I stay quiet to keep the peace",
 ],
 [
 "It makes me feel dismissed and alone",
 "I worry the conversation will never happen",
 "I give them space but feel anxious inside",
 "I try again later when things feel safer",
 "I feel frustrated but don't know how to reach them",
 "I remind myself they may need processing time",
 ],
 [
 "I need patience when I'm overwhelmed emotionally",
 "I process feelings before I can explain them",
 "I shut down when I feel criticized or judged",
 "I want questions instead of immediate advice",
 "I need reassurance that we're on the same team",
 "I communicate better in writing than in person",
 ],
 [
 "I wait for a calm moment to bring it up",
 "I rehearse what I want to say beforehand",
 "I start with how I'm feeling, not blame",
 "I ask if now is a good time to talk",
 "I write it down when I'm too nervous to speak",
 "I bring it up gently over a walk or drive",
 ],
 [
 "When they listen without interrupting me",
 "When they reflect back what they heard",
 "When they stay calm even if I'm upset",
 "When they ask what I need from them",
 "When they put their phone away and focus",
 "When they validate my feelings before responding",
 ],
 ],
 emotional_needs: [
 [
 "I need more reassurance that we're okay",
 "I need patience when I'm processing feelings",
 "I need affection without having to ask",
 "I need to feel chosen and prioritized",
 "I need honesty even when it's uncomfortable",
 "I need space without it meaning rejection",
 ],
 [
 "I want them to sit with me quietly",
 "I want a hug without them trying to fix it",
 "I want them to check in later that day",
 "I want them to listen without giving advice",
 "I want practical help with something small",
 "I want them to say they're here for me",
 ],
 [
 "How much reassurance I need day to day",
 "That silence sometimes means I'm overwhelmed",
 "How deeply their tone affects my mood",
 "That I need affection to feel secure",
 "How much I overthink small changes in energy",
 "That I need patience when I'm anxious",
 ],
 [
 "I hint at it and hope they notice",
 "I wait too long and then feel resentful",
 "I say it directly when I trust the moment",
 "I write a message when speaking feels hard",
 "I bring it up during a calm check-in",
 "I struggle to ask for what I need",
 ],
 [
 "When they are consistent and follow through",
 "When they apologize sincerely after conflict",
 "When they make time for us without distractions",
 "When they respect my boundaries without guilt",
 "When they show affection in my love language",
 "When they don't dismiss my feelings as overreacting",
 ],
 ],
 trust_security: [
 [
 "Consistency in words matching actions over time",
 "Open communication about hard topics",
 "Knowing I can be honest without punishment",
 "Feeling chosen and not compared to others",
 "Having privacy respected without secrecy",
 "Repairing quickly after misunderstandings",
 ],
 [
 "I withdraw and need reassurance before opening up",
 "I ask more questions than I normally would",
 "I try to talk it through right away",
 "I watch for patterns before deciding how to feel",
 "I feel anxious but don't always say so",
 "I need time alone to sort out my feelings",
 ],
 [
 "They followed through when it was inconvenient",
 "They apologized without making excuses",
 "They were honest about something difficult",
 "They showed up when I really needed them",
 "They kept a promise that mattered to me",
 "They listened without getting defensive",
 ],
 [
 "More transparency about what they're thinking",
 "Reassurance during uncertain or stressful seasons",
 "Patience while I rebuild confidence after hurt",
 "Consistency in how they treat me daily",
 "Clear boundaries we both honor together",
 "Repair conversations that feel safe and fair",
 ],
 [
 "We talk openly about what hurt and why",
 "We give each other time without rushing forgiveness",
 "We name what we'll do differently going forward",
 "We avoid keeping score of past mistakes",
 "We check in later to see if trust is rebuilding",
 "We get help if we keep repeating the same hurt",
 ],
 ],
 intimacy: [
 [
 "Emotional check-ins and feeling understood",
 "Physical affection like hugs and touch",
 "Quality time without phones or distractions",
 "Playfulness and laughter together again",
 "Honest conversations about desires and limits",
 "Small daily rituals that make us feel close",
 ],
 [
 "More unhurried time together without distractions",
 "Deeper conversations beyond logistics and tasks",
 "Physical affection that isn't only about sex",
 "Feeling desired and chosen in small ways",
 "Shared experiences that create new memories",
 "Vulnerability without fear of being judged",
 ],
 [
 "I reach out with touch or affection first",
 "I plan time together and protect it on the calendar",
 "I send a thoughtful message during the day",
 "I ask open questions about how they're doing",
 "I suggest an activity we both enjoy",
 "I struggle to initiate and wait for them",
 ],
 [
 "Stress and exhaustion leave little energy left",
 "Unresolved conflict makes closeness feel risky",
 "Feeling unseen or unappreciated over time",
 "Different rhythms for affection and connection",
 "Distractions and screens filling our evenings",
 "Fear of rejection if I open up more",
 ],
 [
 "We're laughing together without tension",
 "We're physically close and relaxed with each other",
 "We're sharing something meaningful, not just tasks",
 "We're being playful and light with each other",
 "We're having an honest talk that feels safe",
 "We're unplugged and fully present with each other",
 ],
 ],
 conflict_patterns: [
 [
 "I get quiet and need space to think",
 "I push to resolve things immediately",
 "I become defensive before I realize it",
 "I try to keep the peace and avoid the fight",
 "I raise my voice when I feel unheard",
 "I shut down and go numb emotionally",
 ],
 [
 "I feel attacked even when they mean well",
 "I explain myself instead of listening first",
 "I apologize quickly to end the tension",
 "I withdraw and stop engaging altogether",
 "I get tearful and struggle to stay grounded",
 "I point out their flaws in response",
 ],
 [
 "We could pause before words we regret",
 "We could listen to understand, not to win",
 "We could repair the same day instead of drifting",
 "We could name feelings without blame or labels",
 "We could take breaks without abandoning each other",
 "We could agree on fair rules for hard talks",
 ],
 [
 "Feeling dismissed or talked over mid-sentence",
 "Tone that sounds critical or contemptuous",
 "Bringing up old issues during a new disagreement",
 "Feeling rushed to respond before I'm ready",
 "Sarcasm or jokes when I'm trying to be serious",
 "Stonewalling or walking away without a plan",
 ],
 [
 "A sincere apology and acknowledgment of hurt",
 "Time to cool off without fear of abandonment",
 "A calm conversation about what each of us needs",
 "Reassurance that we're still on the same team",
 "A specific plan for the next hard conversation",
 "Physical comfort if we're both open to it",
 ],
 ],
 appreciation_gratitude: [
 [
 "Words of affirmation spoken sincerely to me",
 "Acts of service when I'm overwhelmed",
 "Quality time with their full attention",
 "Physical affection and closeness",
 "Thoughtful gestures that show they notice me",
 "Public recognition that I'm valued by them",
 ],
 [
 "How they show up when life gets stressful",
 "The small daily things they do without fanfare",
 "How patient they are with my harder days",
 "The way they make me laugh when I'm low",
 "How they support my goals behind the scenes",
 "How they care for our home or family quietly",
 ],
 [
 "I say thank you for specific things they do",
 "I leave notes or messages during the day",
 "I do something helpful without being asked",
 "I tell others how proud I am of them",
 "I plan something special just for them",
 "I struggle to express appreciation out loud",
 ],
 [
 "Hearing that my effort is noticed and valued",
 "Getting affection when I've had a hard day",
 "Having them brag about me to someone else",
 "A sincere thank-you for something I always do",
 "Undivided attention during a busy week",
 "A small surprise that shows they thought of me",
 ],
 [
 "They listened deeply when I was vulnerable",
 "They defended me or had my back with others",
 "They noticed I was struggling before I said so",
 "They apologized first and meant it sincerely",
 "They made time for us when schedules were packed",
 "They remembered something important to me",
 ],
 ],
 future_vision: [
 [
 "We communicate openly even when it's uncomfortable",
 "We feel emotionally safe and consistently close",
 "We repair conflict without lingering resentment",
 "We share responsibilities in a way that feels fair",
 "We laugh together and enjoy ordinary days",
 "We grow individually without growing apart",
 ],
 [
 "How we handle conflict when stress is high",
 "How much quality time we protect for each other",
 "How we talk about money, family, or big decisions",
 "How we show affection in everyday life",
 "How we support each other's personal goals",
 "How we rebuild trust after misunderstandings",
 ],
 [
 "We can learn healthier patterns together",
 "We still care deeply beneath the current tension",
 "Small consistent changes can compound over time",
 "We're both willing to do the hard inner work",
 "Our history includes moments worth building on",
 "We want the same core things long term",
 ],
 [
 "We might drift further apart if nothing changes",
 "Old patterns could repeat without new tools",
 "Stress could keep crowding out our connection",
 "Resentment could build if needs stay unspoken",
 "We might avoid hard talks until it's too late",
 "External pressures could overwhelm our relationship",
 ],
 [
 "I'm committed to showing up even when it's hard",
 "I want us to feel like teammates again",
 "I'm willing to change patterns that hurt us",
 "I still believe in what we can build together",
 "I need us to be honest about what isn't working",
 "I want a future where we both feel chosen",
 ],
 ],
 family_parenting: [
 [
 "Competing demands leave little couple time",
 "Different parenting styles create tension between us",
 "In-laws or extended family add pressure",
 "Guilt about not doing enough on all fronts",
 "Exhaustion makes patience with each other thin",
 "Old family patterns replay in our relationship",
 ],
 [
 "A united front with kids and boundaries",
 "Shared decision-making about major family choices",
 "Emotional support when family stress is high",
 "Equal partnership in daily household load",
 "Respect for how each of us was raised",
 "Space to vent without it becoming criticism",
 ],
 [
 "We snap at each other when overwhelmed",
 "We divide and conquer without reconnecting",
 "We avoid hard talks until resentment builds",
 "We lean on humor to diffuse the tension",
 "We tag-team and barely check in with each other",
 "We shut down and handle stress alone",
 ],
 [
 "People-pleasing or avoiding conflict from childhood",
 "Feeling responsible for everyone else's emotions",
 "Difficulty asking for help when I'm drowning",
 "Equating love with over-functioning for others",
 "Fear of disappointing family if we set boundaries",
 "Carrying criticism from past relationships forward",
 ],
 [
 "Help with logistics so I can breathe",
 "Emotional backup when family drama flares up",
 "A plan we agree on before talking to family",
 "Reassurance that we're a team first",
 "Time alone together to reset after a hard day",
 "Patience when I'm triggered by family stress",
 ],
 ],
 stress_external: [
 [
 "Work demands eating into our evenings together",
 "Financial pressure creating constant background anxiety",
 "Health concerns for us or someone we love",
 "Caregiving responsibilities pulling us in different directions",
 "Social obligations leaving little recovery time",
 "Uncertainty about housing, jobs, or the future",
 ],
 [
 "I'm shorter tempered and less patient than usual",
 "I withdraw because I don't want to burden them",
 "I over-function and then crash emotionally",
 "I need more reassurance that we're still okay",
 "I struggle to be present even when I'm home",
 "I vent about work and regret it afterward",
 ],
 [
 "Practical help without me having to manage it",
 "Patience when I'm not at my best emotionally",
 "A check-in that isn't another task on my list",
 "Space to decompress before deep conversation",
 "Affirmation that I'm not failing them",
 "A plan for protecting our time together",
 ],
 [
 "We tag-team so neither of us burns out alone",
 "We protect a small ritual of connection daily",
 "We name stress aloud instead of assuming the other knows",
 "We adjust expectations when life is unusually hard",
 "We ask what help looks like instead of guessing",
 "We remind each other we're on the same team",
 ],
 [
 "How much work stress affects my mood at home",
 "That exhaustion can look like distance or irritability",
 "How guilty I feel when I can't show up fully",
 "That I still care deeply even when I'm depleted",
 "How much I need small gestures of support",
 "That I'm trying even when it doesn't look like it",
 ],
 ],
 love_languages: [
 [
 "Thoughtful words that make me feel valued",
 "Undivided time together without distractions",
 "Physical touch like hugs and holding hands",
 "Acts of service when life feels overwhelming",
 "Surprises that show they were thinking of me",
 "Consistent small gestures more than grand ones",
 ],
 [
 "I say affirming things and check in often",
 "I plan quality time and protect it on the calendar",
 "I offer touch and closeness throughout the day",
 "I do helpful tasks without being asked",
 "I bring small gifts or treats they would enjoy",
 "I show love through support during hard seasons",
 ],
 [
 "A sincere compliment when I've doubted myself",
 "A hug when I've had an overwhelming day",
 "An evening planned just for the two of us",
 "Help with something I've been dreading alone",
 "A note or message that says they see me",
 "Choosing me when their schedule is packed",
 ],
 [
 "Words that remind me I'm wanted and chosen",
 "Physical closeness that feels safe and warm",
 "Time together that isn't rushed or distracted",
 "Practical help that lightens my mental load",
 "Playfulness that breaks the tension between us",
 "Patience while I open up again slowly",
 ],
 [
 "More verbal appreciation for what I do daily",
 "More affection that isn't only about intimacy",
 "More protected time together during busy weeks",
 "More follow-through on small promises they make",
 "More curiosity about how I'm really doing",
 "More initiation so I don't always have to ask",
 ],
 ],
};

export const MAX_QUESTION_LENGTH = 220;

const THIRD_PERSON_SELF_PATTERNS = [
 /\bhow does \w+ (describe|feel|see|experience|believe)\b/i,
 /\bwhat does \w+ (believe|feel|think|need|want)\b/i,
 /\bwhen \w+ considers\b/i,
 /\b\w+('s|s) (communication|emotional|relationship)\b/i,
];

/** Fill {partner} placeholder - uses name, or relationship reference when generic. */
export function fillQuestionTemplate(
 template: string,
 partnerFirstName: string,
 relationshipType?: RelationshipType,
 relationshipSubtype?: RelationshipSubtype | null
): string {
 const generic = new Set(["Partner", "Connection", "partner", "connection", ""]);
 let label = partnerFirstName;
 if ((!partnerFirstName || generic.has(partnerFirstName)) && relationshipType) {
 label = getRelationshipReference(relationshipType, relationshipSubtype);
 }
 return template.replace(/\{partner\}/g, label);
}

/** Pick a template by index within a theme (wraps around). */
export function pickTemplateForTheme(
 theme: HealingTheme,
 index = 0
): string {
 const templates = THEME_QUESTIONS[theme];
 return templates[index % templates.length];
}

/** Light personalization by relationship type - swaps generic phrasing where helpful. */
export function personalizeQuestionForRelationship(
 question: string,
 relationshipType?: string
): string {
 if (!relationshipType) return question;

 const swaps: Record<string, [RegExp, string][]> = {
 parent: [
 [/\brelationship with\b/gi, "bond with"],
 [/\bpartner\b/gi, "parent"],
 ],
 child: [
 [/\brelationship with\b/gi, "bond with"],
 [/\bpartner\b/gi, "child"],
 ],
 sibling: [
 [/\brelationship with\b/gi, "sibling bond with"],
 [/\bpartner\b/gi, "sibling"],
 ],
 friend: [
 [/\brelationship with\b/gi, "friendship with"],
 [/\bpartner\b/gi, "friend"],
 [/\bintimacy\b/gi, "closeness"],
 ],
 in_law: [
 [/\bpartner\b/gi, "in-law"],
 [/\brelationship with\b/gi, "family dynamic with"],
 ],
 roommate: [
 [/\bpartner\b/gi, "roommate"],
 [/\brelationship with\b/gi, "living situation with"],
 [/\bintimacy\b/gi, "comfort at home"],
 ],
 ex_partner: [
 [/\bpartner\b/gi, "ex-partner"],
 ],
 };

 let result = question;
 for (const [pattern, replacement] of swaps[relationshipType] || []) {
 result = result.replace(pattern, replacement);
 }
 return result;
}

/** Build a ready-to-ask question from theme + partner name, with optional type personalization. */
export function getStructuredQuestion(
 theme: HealingTheme,
 partnerFirstName: string,
 templateIndex = 0,
 relationshipType?: RelationshipType,
 relationshipSubtype?: RelationshipSubtype | null
): string {
 const template = pickTemplateForTheme(theme, templateIndex);
 const filled = fillQuestionTemplate(
 template,
 partnerFirstName,
 relationshipType,
 relationshipSubtype
 );
 return personalizeQuestionForRelationship(filled, relationshipType);
}

export interface QuestionValidationResult {
 valid: boolean;
 reason?: string;
}

/** Quality guardrails for healing questions. */
export function validateHealingQuestion(
 question: string,
 answererFirstName?: string
): QuestionValidationResult {
 const trimmed = question.trim();
 if (!trimmed) return { valid: false, reason: "empty" };
 if (trimmed.length > MAX_QUESTION_LENGTH) {
 return { valid: false, reason: "too_long" };
 }
 if (!/\b(you|your)\b/i.test(trimmed)) {
 return { valid: false, reason: "missing_second_person" };
 }
 for (const pattern of THIRD_PERSON_SELF_PATTERNS) {
 if (pattern.test(trimmed)) {
 return { valid: false, reason: "third_person_about_self" };
 }
 }
 if (answererFirstName) {
 const first = answererFirstName.split(/\s+/)[0];
 if (first.length > 1) {
 const aboutSelfThirdPerson = new RegExp(
 `\\b(how does|what does|when) ${first}\\b`,
 "i"
 );
 if (aboutSelfThirdPerson.test(trimmed)) {
 return { valid: false, reason: "uses_answerer_name_third_person" };
 }
 }
 }
 return { valid: true };
}

/** Use AI output if valid, otherwise fall back to structured template. */
export function resolveQuestion(
 theme: HealingTheme,
 partnerFirstName: string,
 templateIndex: number,
 aiQuestion?: string | null,
 answererFirstName?: string,
 relationshipType?: RelationshipType,
 relationshipSubtype?: RelationshipSubtype | null
): string {
 if (aiQuestion) {
 const validation = validateHealingQuestion(aiQuestion, answererFirstName);
 if (validation.valid) {
 return personalizeQuestionForRelationship(aiQuestion.trim(), relationshipType);
 }
 }
 return getStructuredQuestion(
 theme,
 partnerFirstName,
 templateIndex,
 relationshipType,
 relationshipSubtype
 );
}

/** Format templates for AI prompt - AI picks index, may lightly adapt. */
export function formatTemplatesForPrompt(theme: HealingTheme, partnerFirstName: string): string {
 return THEME_QUESTIONS[theme]
 .map((t, i) => `${i}: ${fillQuestionTemplate(t, partnerFirstName)}`)
 .join("\n");
}

/** Bubble suggestions for a theme + template index (wraps around). */
export function getBubbleSuggestionsForTheme(
 theme: HealingTheme,
 templateIndex = 0
): string[] {
 const rows = THEME_BUBBLE_SUGGESTIONS[theme];
 if (!rows?.length) return [];
 return rows[templateIndex % rows.length] ?? rows[0];
}

export interface QuestionContextOptions {
 cycleNumber?: number;
 intensityTier?: "foundation" | "deeper" | "maintenance";
 longitudinalPrefix?: string;
 precycleFocus?: string;
 isRecyclingTheme?: boolean;
 priorActionFollowup?: string;
}

/** Build guide context string for question selection. */
export function buildQuestionContextNote(options: QuestionContextOptions): string {
 const parts: string[] = [];
 if (options.intensityTier) {
 const tierHints: Record<string, string> = {
 foundation: "Cycles 1-2: warm, accessible foundation questions.",
 deeper: "Cycles 3-5: go deeper - patterns, needs beneath the surface.",
 maintenance: "Cycle 6+: maintenance check-in - celebrate growth, spot drift early.",
 };
 parts.push(tierHints[options.intensityTier]);
 }
 if (options.longitudinalPrefix) parts.push(options.longitudinalPrefix.trim());
 if (options.isRecyclingTheme) {
 parts.push(
 "This theme was explored before - frame as a longitudinal check-in, referencing growth since last time."
 );
 }
 if (options.precycleFocus) {
 parts.push(`Partner focus for this cycle: ${options.precycleFocus.slice(0, 200)}`);
 }
 if (options.priorActionFollowup) {
 parts.push(`Include follow-up: ${options.priorActionFollowup}`);
 }
 if (options.cycleNumber) parts.push(`Cycle ${options.cycleNumber}.`);
 return parts.filter(Boolean).join(" ");
}

/** First question of a cycle may weave in prior action follow-up. */
export function buildActionFollowupQuestion(
 actionStep: string,
 partnerFirstName: string
): string {
 const action = actionStep.replace(/^[^:]+:\s*/, "").slice(0, 100);
 return `Did you try "${action}" since your last cycle? What happened when you and ${partnerFirstName} attempted it?`;
}
