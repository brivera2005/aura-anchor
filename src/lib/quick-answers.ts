import {
  AGE_RANGES,
  LIVING_SITUATIONS,
  RELATIONSHIP_LENGTHS,
} from "./constants";
import type { HealingTheme } from "./healing-themes";
import { HEALING_THEMES } from "./healing-themes";
import { getBubbleSuggestionsForTheme } from "./theme-questions";

export interface QuickAnswerConfig {
  suggestions: string[];
  multiSelect?: boolean;
  separator?: string;
}

export const MIN_CHIP_WORDS = 3;
export const MIN_CHIP_CHARS = 12;

const YES_NO_PHRASES = [
  "Yes, most of the time",
  "No, not really",
  "Sometimes, depends on the day",
  "I'm not sure yet",
];

export const RELATIONSHIP_STRENGTHS = [
  "They are a really good listener",
  "They stay patient when I'm struggling",
  "They show up when I need support",
  "They are honest even when it's hard",
  "They make me feel wanted and chosen",
  "They follow through on what they promise",
  "They try to understand my perspective",
  "They bring lightness when life feels heavy",
  "They work hard for our shared future",
  "They stay loyal through difficult seasons",
];

export const RELATIONSHIP_STRUGGLES = [
  "We struggle to communicate under stress",
  "I find it hard to express my feelings",
  "I need more patience during conflict",
  "We have trouble setting healthy boundaries",
  "Trust still feels fragile at times",
  "We repeat the same arguments often",
  "We don't protect enough quality time",
  "I don't always feel truly heard",
  "Being vulnerable still feels risky for me",
];

export const PARTNER_NEEDS = [
  "I need more protected quality time together",
  "I need clearer and kinder communication",
  "I need more physical affection and closeness",
  "I need more emotional support on hard days",
  "I need more help with daily responsibilities",
  "I need more words of affirmation from them",
  "I need space without it meaning rejection",
  "I need to feel more appreciated and seen",
];

export const LOVE_LANGUAGE_CHIPS = [
  "Words of affirmation mean a lot to me",
  "Quality time together matters most to me",
  "Physical touch helps me feel connected",
  "Acts of service show me they care",
  "Thoughtful gifts make me feel remembered",
  "Listening deeply helps me feel understood",
  "Shared humor helps me feel close to them",
  "Practical support helps me feel loved",
];

export const HOW_MET_CHIPS = [
  "We met through mutual friends",
  "We met through work or a shared job",
  "We met online and built from there",
  "We met in school or college years ago",
  "We met through a shared hobby or interest",
  "We met by chance in everyday life",
  "We were introduced by family members",
];

export const CHALLENGE_CHIPS = [
  "Communication breaks down under stress",
  "Trust still needs intentional rebuilding",
  "Emotional or physical intimacy feels distant",
  "We struggle to repair after conflict",
  "Money or finances create ongoing tension",
  "Parenting adds pressure to our relationship",
  "Distance or schedules keep us apart",
  "We want different things right now",
  "Past hurts still affect how we connect",
  "Burnout makes patience with each other thin",
];

export const HOPE_CHIPS = [
  "Open and honest communication between us",
  "Mutual trust that feels steady over time",
  "Feeling emotionally close and connected again",
  "Working through conflict with more calm",
  "More protected time together each week",
  "Feeling appreciated for what we each give",
  "Growing together instead of drifting apart",
  "More peace and stability at home together",
];

export const ONBOARDING_FIELD_SUGGESTIONS: Record<string, QuickAnswerConfig> = {
  age_range: { suggestions: AGE_RANGES, multiSelect: false },
  relationship_length: { suggestions: RELATIONSHIP_LENGTHS, multiSelect: false },
  living_situation: { suggestions: LIVING_SITUATIONS, multiSelect: false },
  self_strengths: { suggestions: RELATIONSHIP_STRENGTHS, multiSelect: true },
  self_weaknesses: { suggestions: RELATIONSHIP_STRUGGLES, multiSelect: true },
  self_needs: { suggestions: PARTNER_NEEDS, multiSelect: true },
  partner_strengths: { suggestions: RELATIONSHIP_STRENGTHS, multiSelect: true },
  partner_weaknesses: { suggestions: RELATIONSHIP_STRUGGLES, multiSelect: true },
  partner_love_language: { suggestions: LOVE_LANGUAGE_CHIPS, multiSelect: true },
  how_met: { suggestions: HOW_MET_CHIPS, multiSelect: true },
  current_challenge: { suggestions: CHALLENGE_CHIPS, multiSelect: true },
  hope_for_future: { suggestions: HOPE_CHIPS, multiSelect: true },
};

const QUESTION_PATTERNS: Array<{ pattern: RegExp; config: QuickAnswerConfig }> = [
  {
    pattern: /\b(yes or no|do you|did you|have you|would you|are you|is there)\b/i,
    config: { suggestions: YES_NO_PHRASES, multiSelect: false },
  },
  {
    pattern: /\b(feel|feeling|felt|emotion)\b/i,
    config: {
      suggestions: [
        "I feel loved when they show up consistently",
        "I feel frustrated when we talk past each other",
        "I feel hopeful when we repair after conflict",
        "I feel distant when we're both too busy",
        "I feel appreciated when they notice small things",
        "I feel anxious when tension goes unspoken",
      ],
      multiSelect: true,
    },
  },
  {
    pattern: /\b(communicat|listen|talk|share|express|shut down|heated)\b/i,
    config: {
      suggestions: [
        "I tend to shut down when things get heated",
        "I need time to cool off before talking",
        "I want to be heard before offering solutions",
        "We talk past each other when we're stressed",
        "I avoid hard topics until I feel safer",
        "I need a calmer moment to say what I mean",
      ],
      multiSelect: true,
    },
  },
  {
    pattern: /\b(trust|betray|honest|loyal|secure|safe)\b/i,
    config: {
      suggestions: [
        "I'm still rebuilding trust after past hurts",
        "Consistency over time helps me feel secure",
        "I want more transparency about hard topics",
        "I feel safest when we repair quickly",
        "Broken promises linger in my mind for a while",
        "I feel secure when actions match their words",
      ],
      multiSelect: true,
    },
  },
  {
    pattern: /\b(need|want|wish|hope|crave)\b/i,
    config: { suggestions: PARTNER_NEEDS, multiSelect: true },
  },
  {
    pattern: /\b(strength|appreciate|admire|love about|grateful)\b/i,
    config: { suggestions: RELATIONSHIP_STRENGTHS, multiSelect: true },
  },
  {
    pattern: /\b(struggle|challenge|difficult|hard|tension|conflict|fight)\b/i,
    config: { suggestions: CHALLENGE_CHIPS, multiSelect: true },
  },
  {
    pattern: /\b(change|improve|better|grow|repair|differently)\b/i,
    config: {
      suggestions: [
        "I want more protected quality time together",
        "I want us to communicate with more patience",
        "I want less conflict lingering overnight",
        "I want more affection in everyday moments",
        "I want to feel more appreciated and seen",
        "I want us to follow through on promises",
      ],
      multiSelect: true,
    },
  },
  {
    pattern: /\b(intimacy|close|closeness|affection|touch)\b/i,
    config: {
      suggestions: [
        "I miss unhurried time together without distractions",
        "I want more physical affection throughout the day",
        "I feel closest when we're laughing together",
        "Stress makes it hard to stay emotionally open",
        "I need vulnerability to feel safe, not risky",
        "Small daily rituals would help me feel closer",
      ],
      multiSelect: true,
    },
  },
];

const DEFAULT_QUESTION_CONFIG: QuickAnswerConfig = {
  suggestions: [
    "I need to think about this more",
    "It's complicated and hard to summarize",
    "I'm not fully sure how I feel yet",
    "It depends on the day and our stress",
    "I want to answer honestly but carefully",
    "I feel differently than I used to",
  ],
  multiSelect: true,
};

function isHealingTheme(value: string | undefined): value is HealingTheme {
  return !!value && (HEALING_THEMES as readonly string[]).includes(value);
}

export function isValidPhraseChip(chip: string): boolean {
  const trimmed = chip.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < MIN_CHIP_WORDS) return false;
  if (trimmed.length < MIN_CHIP_CHARS) return false;
  if (/^(yes|no|maybe|love|angry|happy|sad)$/i.test(trimmed)) return false;
  return true;
}

export function sanitizePhraseChips(chips: string[], limit = 6): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];

  for (const chip of chips) {
    const normalized = chip.trim();
    if (!isValidPhraseChip(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(normalized);
    if (valid.length >= limit) break;
  }

  return valid;
}

export function getQuickAnswersForField(fieldKey: string): QuickAnswerConfig | null {
  return ONBOARDING_FIELD_SUGGESTIONS[fieldKey] ?? null;
}

export function getQuickAnswersForQuestion(
  questionText: string,
  theme?: string,
  templateIndex = 0
): QuickAnswerConfig {
  if (isHealingTheme(theme)) {
    const themeSuggestions = sanitizePhraseChips(
      getBubbleSuggestionsForTheme(theme, templateIndex)
    );
    if (themeSuggestions.length > 0) {
      return { suggestions: themeSuggestions, multiSelect: true };
    }
  }

  for (const { pattern, config } of QUESTION_PATTERNS) {
    if (pattern.test(questionText)) {
      const suggestions = sanitizePhraseChips(config.suggestions);
      if (suggestions.length > 0) {
        return { ...config, suggestions };
      }
    }
  }

  return {
    ...DEFAULT_QUESTION_CONFIG,
    suggestions: sanitizePhraseChips(DEFAULT_QUESTION_CONFIG.suggestions),
  };
}
