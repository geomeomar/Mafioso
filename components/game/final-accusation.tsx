"use client";

import { useState } from "react";
import { AVATAR_OPTIONS } from "@/types/game";
import type { RoomPlayer } from "@/types/database";

interface FinalAccusationProps {
  /** The jailed innocent who gets to pick */
  accuserPlayer: RoomPlayer;
  /** All alive players (potential targets) */
  alivePlayers: RoomPlayer[];
  /** Current user's player ID */
  currentPlayerId: string;
  /** Called when the accuser makes their pick */
  onAccuse: (targetPlayerId: string) => void;
  /** Whether the accusation has been submitted */
  hasAccused: boolean;
}

export function FinalAccusation({
  accuserPlayer,
  alivePlayers,
  currentPlayerId,
  onAccuse,
  hasAccused,
}: FinalAccusationProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const isAccuser = currentPlayerId === accuserPlayer.id;
  const accuserAvatar = AVATAR_OPTIONS.find((a) => a.id === accuserPlayer.avatar);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirmed(true);
    onAccuse(selected);
  };

  // Non-accuser players see a waiting screen
  if (!isAccuser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⚖️</div>
          <h2 className="text-2xl font-bold mb-2">الاتهام الأخير</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-3xl">{accuserAvatar?.emoji ?? "🎭"}</span>
            <span className="font-semibold text-lg">{accuserPlayer.nickname}</span>
          </div>
          <p className="text-muted-foreground">
            {accuserPlayer.nickname} اتحبس وبيختار مين المافيوزو...
          </p>
          <div className="mt-6 animate-pulse text-muted-foreground">⏳ مستني الاختيار...</div>
        </div>
      </div>
    );
  }

  // Accuser already submitted
  if (hasAccused || confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-bold mb-2">اختيارك اتسجل</h2>
          <p className="text-muted-foreground">مستني النتيجة...</p>
        </div>
      </div>
    );
  }

  // Accuser picks who is mafioso
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚖️</div>
          <span className="text-sm text-danger bg-danger/10 px-3 py-1 rounded-full">
            الاتهام الأخير
          </span>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">أنت اتحبست!</h2>
        <p className="text-muted-foreground text-center text-sm mb-8">
          اختار مين تشك إنه المافيوزو من الباقيين. لو صح — الأبرياء يكسبوا!
        </p>

        <div className="space-y-3 mb-8">
          {alivePlayers.map((player) => {
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
          أكّد الاتهام
        </button>
      </div>
    </div>
  );
}
