"use client";

import { QuickAnswerChips, type QuickAnswerChipsProps } from "@/components/quick-answer-chips";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import type { QuickAnswerConfig } from "@/lib/quick-answers";
import { cn } from "@/lib/utils";

interface AnswerInputProps extends Omit<TextareaProps, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  quickAnswers?: QuickAnswerConfig | null;
  chipsPosition?: "above" | "below";
}

export function AnswerInput({
  value,
  onChange,
  quickAnswers,
  chipsPosition = "above",
  className,
  ...textareaProps
}: AnswerInputProps) {
  const chipsProps: QuickAnswerChipsProps | null = quickAnswers
    ? {
        suggestions: quickAnswers.suggestions,
        value,
        onChange,
        multiSelect: quickAnswers.multiSelect ?? true,
        separator: quickAnswers.separator ?? ", ",
      }
    : null;

  const textarea = (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className)}
      {...textareaProps}
    />
  );

  if (!chipsProps) {
    return textarea;
  }

  return (
    <div className="space-y-3">
      {chipsPosition === "above" && <QuickAnswerChips {...chipsProps} />}
      {textarea}
      {chipsPosition === "below" && <QuickAnswerChips {...chipsProps} />}
    </div>
  );
}
