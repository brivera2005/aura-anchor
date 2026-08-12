export const HEALING_THEMES = [
 "communication_styles",
 "emotional_needs",
 "trust_security",
 "intimacy",
 "conflict_patterns",
 "appreciation_gratitude",
 "future_vision",
 "family_parenting",
 "stress_external",
 "love_languages",
] as const;

export type HealingTheme = (typeof HEALING_THEMES)[number];

export const THEME_LABELS: Record<HealingTheme, string> = {
 communication_styles: "Communication styles",
 emotional_needs: "Emotional needs",
 trust_security: "Trust & security",
 intimacy: "Intimacy (emotional & physical)",
 conflict_patterns: "Conflict patterns",
 appreciation_gratitude: "Appreciation & gratitude",
 future_vision: "Future vision",
 family_parenting: "Family & parenting",
 stress_external: "Stress & external pressures",
 love_languages: "Love languages",
};

import { DEEP_DIVE_QUESTIONS } from "./cycle-config";
import {
 pickNextThemeFromMemory,
 pickThemesForCycleFromMemory,
} from "./theme-memory";

/** Default questions per cycle (deep dive mode). */
export const QUESTIONS_PER_CYCLE = DEEP_DIVE_QUESTIONS;

/** Pick the next theme - never repeats until all 10 themes used. */
export function pickNextTheme(themesCovered: string[]): HealingTheme {
 return pickNextThemeFromMemory(themesCovered);
}

/** Distinct themes for a new cycle from theme memory. */
export function pickThemesForCycle(
 themesCovered: string[],
 count = QUESTIONS_PER_CYCLE
): HealingTheme[] {
 return pickThemesForCycleFromMemory(themesCovered, count).themes;
}