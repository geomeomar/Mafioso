"use client";

interface EvidenceRevealProps {
  roundNumber: number;
  evidenceText: string;
  isHost: boolean;
  onContinue: () => void;
  playerNickname: string;
  characterName: string | null;
  characterProfile: string | null;
  playerRole: string | null;
}

export function EvidenceReveal({
  roundNumber,
  evidenceText,
  isHost,
  onContinue,
  playerNickname,
  characterName,
  characterProfile,
  playerRole,
}: EvidenceRevealProps) {
  const isMafioso = playerRole === "mafioso";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full">
        {/* Player identity box */}
        <div
          className={`flex items-center gap-3 rounded-xl p-3 mb-6 border ${
            isMafioso
              ? "bg-danger/10 border-danger/30"
              : "bg-card border-border"
          }`}
        >
          <div className="text-3xl">{isMafioso ? "🔪" : "😇"}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{playerNickname}</p>
            {characterName && (
              <p className={`text-xs ${isMafioso ? "text-danger" : "text-accent"}`}>
                {characterName}
              </p>
            )}
            {characterProfile && (
              <p className="text-xs text-muted-foreground truncate">{characterProfile}</p>
            )}
          </div>
          <div
            className={`text-xs font-semibold px-2 py-1 rounded-lg ${
              isMafioso
                ? "bg-danger/20 text-danger"
                : "bg-success/20 text-success"
            }`}
          >
            {isMafioso ? "مافيوزو" : "بريء"}
          </div>
        </div>

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
