"use client";

import { HEALING_THEMES, THEME_LABELS, type HealingTheme } from "@/lib/healing-themes";
import { cn } from "@/lib/utils";

export function ThemeCoverageChart({
  coveredThemes,
  className,
}: {
  coveredThemes: string[];
  className?: string;
}) {
  const covered = new Set(coveredThemes);
  const count = covered.size;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Themes explored</span>
        <span className="font-medium">{count}/10</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {HEALING_THEMES.map((theme) => {
          const explored = covered.has(theme);
          return (
            <div key={theme} className="group flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-3 w-3 rounded-full transition-all duration-300 sm:h-3.5 sm:w-3.5",
                  explored
                    ? "bg-primary shadow-[0_0_8px_rgba(196,120,106,0.5)] scale-110"
                    : "bg-muted border border-border/60"
                )}
                title={THEME_LABELS[theme as HealingTheme]}
              />
              <span className="hidden text-[9px] text-muted-foreground group-hover:block sm:block truncate max-w-[52px] text-center leading-tight">
                {THEME_LABELS[theme as HealingTheme].split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
