"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";



const ANALYSIS_TIMEOUT_MS = 60_000;



export function AnalyzeOnboardingButton({

  relationshipId,

  redirectTo,

  label = "Begin deep analysis",

  replace = false,

  onAnalyzingChange,

}: {

  relationshipId: string;

  redirectTo?: string;

  label?: string;

  replace?: boolean;

  onAnalyzingChange?: (analyzing: boolean) => void;

}) {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);



  const setAnalyzing = useCallback(

    (value: boolean) => {

      setLoading(value);

      onAnalyzingChange?.(value);

    },

    [onAnalyzingChange]

  );



  useEffect(() => {

    return () => setAnalyzing(false);

  }, [setAnalyzing]);



  async function runAnalysis() {

    if (inFlightRef.current) return;

    inFlightRef.current = true;

    setAnalyzing(true);

    setError(null);



    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);



    try {

      const res = await fetch("/api/ai/analyze-onboarding", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ relationshipId, replace }),

        signal: controller.signal,

      });

      const data = await res.json().catch(() => ({}));



      if (!res.ok) {

        throw new Error(data.error || `Analysis failed (${res.status})`);

      }



      if (redirectTo) {

        router.push(redirectTo);

      } else {

        router.refresh();

      }

    } catch (err) {

      if (err instanceof DOMException && err.name === "AbortError") {

        setError(

          "Analysis is taking longer than expected. Please wait a moment, refresh, and try again."

        );

      } else {

        setError(err instanceof Error ? err.message : "Something went wrong");

      }

    } finally {

      window.clearTimeout(timeoutId);

      inFlightRef.current = false;

      setAnalyzing(false);

    }

  }



  return (

    <div>

      <Button onClick={runAnalysis} disabled={loading}>

        {loading ? (

          <Loader2 className="h-4 w-4 animate-spin" />

        ) : (

          <Sparkles className="h-4 w-4" />

        )}

        {loading ? "Analyzing your stories…" : label}

      </Button>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

    </div>

  );

}

