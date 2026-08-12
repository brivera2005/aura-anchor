"use client";

import { cn } from "@/lib/utils";
import { sanitizePhraseChips } from "@/lib/quick-answers";

export interface QuickAnswerChipsProps {
 suggestions: string[];
 value: string;
 onChange: (value: string) => void;
 multiSelect?: boolean;
 separator?: string;
 label?: string;
 className?: string;
}

function parseTokens(value: string, separator: string): string[] {
 if (!value.trim()) return [];
 if (separator === "\n") {
 return value
 .split("\n")
 .map((part) => part.trim())
 .filter(Boolean);
 }
 return value
 .split(/,\s*/)
 .map((part) => part.trim())
 .filter(Boolean);
}

function joinTokens(tokens: string[], separator: string): string {
 return tokens.join(separator === "\n" ? "\n" : ", ");
}

function isChipSelected(chip: string, value: string, multiSelect: boolean, separator: string): boolean {
 if (!multiSelect) {
 return value.trim() === chip;
 }
 return parseTokens(value, separator).includes(chip);
}

function toggleChip(
 chip: string,
 value: string,
 multiSelect: boolean,
 separator: string
): string {
 if (!multiSelect) {
 return value.trim() === chip ? "" : chip;
 }

 const tokens = parseTokens(value, separator);
 const index = tokens.indexOf(chip);

 if (index >= 0) {
 tokens.splice(index, 1);
 return joinTokens(tokens, separator);
 }

 return tokens.length > 0 ? joinTokens([...tokens, chip], separator) : chip;
}

export function QuickAnswerChips({
 suggestions,
 value,
 onChange,
 multiSelect = true,
 separator = ", ",
 label = "Quick answers",
 className,
}: QuickAnswerChipsProps) {
 const chips = sanitizePhraseChips(suggestions);
 if (chips.length === 0) return null;

 return (
 <div className={cn("space-y-2", className)}>
 <p className="text-xs font-medium text-muted-foreground">{label}</p>
 <div className="flex flex-wrap gap-2">
 {chips.map((chip) => {
 const selected = isChipSelected(chip, value, multiSelect, separator);
 return (
 <button
 key={chip}
 type="button"
 onClick={() => onChange(toggleChip(chip, value, multiSelect, separator))}
 className={cn(
 "min-h-10 rounded-full border px-4 py-2 text-sm transition-all",
 "touch-manipulation active:scale-[0.98]",
 selected
 ? "border-primary bg-primary text-primary-foreground shadow-sm"
 : "border-border bg-muted/40 text-foreground hover:border-primary/50 hover:bg-muted"
 )}
 aria-pressed={selected}
 >
 {chip}
 </button>
 );
 })}
 </div>
 <p className="text-xs text-muted-foreground">
 Tap to {multiSelect ? "add or remove" : "select"} - or type your own below
 </p>
 </div>
 );
}
