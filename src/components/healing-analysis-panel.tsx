"use client";



import { useState } from "react";

import { AnalyzeOnboardingButton } from "@/components/analyze-button";

import { RelationshipProgressSteps } from "@/components/relationship-progress-steps";



export function HealingAnalysisPanel({

  relationshipId,

  redirectTo,

  label = "Start healing session",

  replace = false,

}: {

  relationshipId: string;

  redirectTo?: string;

  label?: string;

  replace?: boolean;

}) {

  const [analyzing, setAnalyzing] = useState(false);



  return (

    <div className="space-y-4">

      <RelationshipProgressSteps

        steps={[

          { label: "You completed onboarding", done: true },

          { label: "Partner joined & onboarded", done: true },

          {

            label: "Deep analysis together",

            done: false,

            active: analyzing,

          },

          { label: "Healing loop begins", done: false },

        ]}

      />

      <AnalyzeOnboardingButton

        relationshipId={relationshipId}

        redirectTo={redirectTo}

        label={label}

        replace={replace}

        onAnalyzingChange={setAnalyzing}

      />

    </div>

  );

}

