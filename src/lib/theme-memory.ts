import {
 HEALING_THEMES,
 type HealingTheme,
} from "./healing-themes";

export interface CycleThemeRecord {
 cycleNumber: number;
 themes: string[];
}

/** All themes ever covered across completed cycles + current relationship tally. */
export function collectThemesFromHistory(
 cycleRecords: CycleThemeRecord[],
 relationshipThemesCovered: string[] = []
): string[] {
 const all = new Set<string>();
 for (const record of cycleRecords) {
 for (const t of record.themes) all.add(t);
 }
 for (const t of relationshipThemesCovered) all.add(t);
 return [...all];
}

/** Pick next theme - never repeats until all 10 themes used once. */
export function pickNextThemeFromMemory(allThemesUsed: string[]): HealingTheme {
 const used = new Set(allThemesUsed);
 const uncovered = HEALING_THEMES.filter((t) => !used.has(t));
 if (uncovered.length > 0) return uncovered[0];
 const recycleIndex = allThemesUsed.length % HEALING_THEMES.length;
 return HEALING_THEMES[recycleIndex];
}

/** Pick themes for a new cycle - prefer unused themes; recycle with longitudinal framing when pool exhausted. */
export function pickThemesForCycleFromMemory(
 allThemesUsed: string[],
 count: number
): { themes: HealingTheme[]; isRecycling: boolean } {
 const used = new Set(allThemesUsed);
 const uncovered = HEALING_THEMES.filter((t) => !used.has(t));
 const isRecycling = uncovered.length < count;

 const pool: HealingTheme[] =
 uncovered.length >= count
 ? [...uncovered]
 : [...uncovered, ...HEALING_THEMES.filter((t) => used.has(t))];

 while (pool.length < count) {
 pool.push(...HEALING_THEMES);
 }

 return {
 themes: pool.slice(0, count) as HealingTheme[],
 isRecycling,
 };
}

export function getIntensityTier(cycleNumber: number): "foundation" | "deeper" | "maintenance" {
 if (cycleNumber <= 2) return "foundation";
 if (cycleNumber <= 5) return "deeper";
 return "maintenance";
}

/** Alias for collectThemesFromHistory */
export const collectThemesFromMemory = collectThemesFromHistory;

export function getLongitudinalPrefix(
 cycleNumber: number,
 priorInsightSnippet?: string
): string {
 if (cycleNumber <= 1) return "";
 const base =
 cycleNumber > 10
 ? "Checking back in - "
 : "Building on what you shared before - ";
 if (priorInsightSnippet) {
 return `${base}Last cycle you noted: "${priorInsightSnippet.slice(0, 120)}…" `;
 }
 return base;
}
