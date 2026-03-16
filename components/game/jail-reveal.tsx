"use client";

import { AVATAR_OPTIONS } from "@/types/game";
import type { RoomPlayer } from "@/types/database";

interface JailRevealProps {
  jailedPlayer: RoomPlayer | null;
  wasTie: boolean;
  onContinue: () => void;
}

export function JailReveal({ jailedPlayer, wasTie, onContinue }: JailRevealProps) {
  if (wasTie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">⚖️</div>
          <h2 className="text-2xl font-bold mb-2">تعادل!</h2>
          <p className="text-muted-foreground mb-8">
            محدش اتحبس الجولة دي... التصويت كان متعادل
          </p>
          <button
            onClick={onContinue}
            className="bg-card hover:bg-card/80 border border-border text-foreground py-3 px-8 rounded-xl font-semibold transition-colors"
          >
            كمّل اللعبة
          </button>
        </div>
      </div>
    );
  }

  if (!jailedPlayer) return null;

  const avatar = AVATAR_OPTIONS.find((a) => a.id === jailedPlayer.avatar);
  const wasMafioso = jailedPlayer.assigned_role === "mafioso";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">{avatar?.emoji ?? "🎭"}</div>
        <h2 className="text-2xl font-bold mb-2">{jailedPlayer.nickname}</h2>
        <p className="text-lg text-muted-foreground mb-6">اتمسك واتحبس!</p>

        <div
          className={`inline-block text-2xl font-bold px-6 py-3 rounded-xl mb-8 ${
            wasMafioso
              ? "bg-danger/20 text-danger border border-danger/30"
              : "bg-success/20 text-success border border-success/30"
          }`}
        >
          {wasMafioso ? "🔪 كان مافيوزو!" : "😇 كان بريء!"}
        </div>

        <button
          onClick={onContinue}
          className="block w-full bg-card hover:bg-card/80 border border-border text-foreground py-3 rounded-xl font-semibold transition-colors"
        >
          كمّل
        </button>
      </div>
    </div>
  );
}
