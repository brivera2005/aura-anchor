"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnswerInput } from "@/components/answer-input";
import { createClient } from "@/lib/supabase/client";
import { getQuickAnswersForQuestion, sanitizePhraseChips } from "@/lib/quick-answers";
import type { AIQuestion } from "@/lib/types";

export default function QuestionPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<AIQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [progressNote, setProgressNote] = useState("");
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [cycleComplete, setCycleComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickAnswers = useMemo(() => {
    if (!question) return null;
    const stored = question.context?.bubble_suggestions;
    const templateIndex =
      typeof question.context?.template_index === "number"
        ? question.context.template_index
        : Math.max(0, (question.context?.question_number as number | undefined ?? 1) - 1);

    if (Array.isArray(stored) && stored.every((s) => typeof s === "string")) {
      const sanitized = sanitizePhraseChips(stored as string[]);
      if (sanitized.length > 0) {
        return { suggestions: sanitized, multiSelect: true };
      }
    }
    return getQuickAnswersForQuestion(
      question.question_text,
      question.theme ?? undefined,
      templateIndex
    );
  }, [question]);

  useEffect(() => {
    async function loadQuestion() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("ai_questions")
        .select("*")
        .eq("id", questionId)
        .eq("for_user_id", user.id)
        .single();

      setQuestion(data);
      setLoading(false);
    }
    loadQuestion();
  }, [questionId, router]);

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/process-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setProgressNote(data.progressNote);
      setNextQuestionId(data.nextQuestionId);
      setRelationshipId(data.relationshipId);
      setPartnerName(data.partnerName || null);
      setCycleComplete(!!data.cycleComplete);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!question) {
    return (
      <AppShell>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Question not found or already answered.</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard">Back to healing loop</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (done) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg space-y-6">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-10 text-center">
              <Check className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
              <h2 className="font-serif text-2xl font-semibold">Thank you for sharing</h2>
              <p className="mt-2 text-muted-foreground">{progressNote}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {cycleComplete
                  ? `Deep cycle analysis is now available for you and ${partnerName || "your partner"}.`
                  : `A briefing has been sent to ${partnerName || "your partner"} to help them understand your perspective.`}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {relationshipId && (
                  <Button asChild>
                    <Link href={`/relationship/${relationshipId}/loop`}>
                      View healing loop
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {nextQuestionId && (
                  <Button variant={relationshipId ? "outline" : "default"} asChild>
                    <Link href={`/question/${nextQuestionId}`}>
                      Next question
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Healing question</p>
          <h1 className="font-serif mt-1 text-2xl font-semibold sm:text-3xl">
            {question.question_text}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your answer</CardTitle>
            <CardDescription>
              Take your time. Honest, thoughtful answers help your partner understand you better.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAnswer} className="space-y-4">
              <AnswerInput
                placeholder="Share what's on your heart..."
                value={answer}
                onChange={setAnswer}
                quickAnswers={quickAnswers}
                className="min-h-[200px]"
                required
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Encrypted before storage
                </p>
                <Button type="submit" disabled={submitting || !answer.trim()}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit answer"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
