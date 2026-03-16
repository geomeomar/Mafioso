"use client";

import type { Case } from "@/types/database";

interface CaseIntroProps {
  caseData: Case;
  isHost: boolean;
  onContinue: () => void;
}

export function CaseIntro({ caseData, isHost, onContinue }: CaseIntroProps) {
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
          disabled={!isHost}
          className={`w-full text-accent-foreground py-4 rounded-xl text-lg font-semibold transition-colors ${isHost ? "bg-accent hover:bg-accent/90" : "bg-accent/50 opacity-50 cursor-not-allowed"}`}
        >
          يلا نبدأ التحقيق
        </button>
        {!isHost && (
          <p className="text-xs text-muted-foreground mt-2 text-center">مستني المضيف يكمّل...</p>
        )}
      </div>
    </div>
  );
}
