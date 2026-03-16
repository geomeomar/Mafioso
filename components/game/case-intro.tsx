"use client";

import type { Case } from "@/types/database";

interface CaseIntroProps {
  caseData: Case;
  onContinue: () => void;
}

export function CaseIntro({ caseData, onContinue }: CaseIntroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <span className="text-sm text-accent bg-accent/10 px-3 py-1 rounded-full">
            {caseData.crime_type}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">{caseData.title}</h1>

        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <p className="text-foreground leading-relaxed text-base whitespace-pre-line">
            {caseData.intro}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          يلا نبدأ التحقيق
        </button>
      </div>
    </div>
  );
}
