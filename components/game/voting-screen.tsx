"use client";

import { useState } from "react";
import { AVATAR_OPTIONS } from "@/types/game";
import type { RoomPlayer } from "@/types/database";

interface VotingScreenProps {
  alivePlayers: RoomPlayer[];
  currentPlayerId: string;
  roundNumber: number;
  isRevote: boolean;
  onVote: (targetPlayerId: string) => void;
  hasVoted: boolean;
  waitingCount: number;
}

export function VotingScreen({
  alivePlayers,
  currentPlayerId,
  roundNumber,
  isRevote,
  onVote,
  hasVoted,
  waitingCount,
}: VotingScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const otherPlayers = alivePlayers.filter((p) => p.id !== currentPlayerId);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirmed(true);
    onVote(selected);
  };

  if (hasVoted || confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-bold mb-2">صوّتك اتسجل</h2>
          <p className="text-muted-foreground">
            مستني {waitingCount} لاعب تاني يصوّت...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <span className="text-sm text-danger bg-danger/10 px-3 py-1 rounded-full">
            {isRevote ? "إعادة تصويت" : `تصويت الجولة ${roundNumber}`}
          </span>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">صوّت دلوقتي</h2>
        <p className="text-muted-foreground text-center text-sm mb-8">
          مين تشك فيه إنه المافيوزو؟
        </p>

        <div className="space-y-3 mb-8">
          {otherPlayers.map((player) => {
            const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);
            const isSelected = selected === player.id;

            return (
              <button
                key={player.id}
                onClick={() => setSelected(player.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-danger bg-danger/10 scale-[1.02]"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
              >
                <span className="text-3xl">{avatar?.emoji ?? "🎭"}</span>
                <span className="font-semibold text-lg">{player.nickname}</span>
                {isSelected && (
                  <span className="mr-auto text-danger text-sm">متهم</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="w-full bg-danger hover:bg-danger/90 disabled:opacity-50 text-white py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          أكّد التصويت
        </button>
      </div>
    </div>
  );
}
