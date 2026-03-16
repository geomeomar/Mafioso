"use client";

interface EvidenceRevealProps {
  roundNumber: number;
  evidenceText: string;
  isHost: boolean;
  onContinue: () => void;
}

export function EvidenceReveal({ roundNumber, evidenceText, isHost, onContinue }: EvidenceRevealProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <span className="text-sm text-warning bg-warning/10 px-3 py-1 rounded-full">
            جولة {roundNumber}
          </span>
        </div>

        <h2 className="text-xl font-bold text-center mb-6">ظهر دليل جديد</h2>

        <div className="bg-card border border-warning/30 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-warning" />
          <p className="text-foreground leading-relaxed text-base whitespace-pre-line">
            {evidenceText}
          </p>
        </div>

        <button
          onClick={onContinue}
          disabled={!isHost}
          className={`w-full border border-border text-foreground py-4 rounded-xl text-lg font-semibold transition-colors ${isHost ? "bg-card hover:bg-card/80" : "bg-card/50 opacity-50 cursor-not-allowed"}`}
        >
          ابدأ النقاش
        </button>
        {!isHost && (
          <p className="text-xs text-muted-foreground mt-2 text-center">مستني المضيف يكمّل...</p>
        )}
      </div>
    </div>
  );
}
