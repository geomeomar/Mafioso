"use client";

import { useState } from "react";
import { AVATAR_OPTIONS } from "@/types/game";
import type { RoomPlayer, CaseCharacter } from "@/types/database";

interface RoleRevealProps {
  player: RoomPlayer;
  character: CaseCharacter | null;
  partnerNames: string[];
  isHost: boolean;
  onContinue: () => void;
}

export function RoleReveal({ player, character, partnerNames, isHost, onContinue }: RoleRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);
  const isMafioso = player.assigned_role === "mafioso";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {!revealed ? (
        <div className="text-center">
          <div className="text-6xl mb-6">{avatar?.emoji ?? "🎭"}</div>
          <h2 className="text-2xl font-bold mb-2">{player.nickname}</h2>
          <p className="text-muted-foreground mb-8">دورك في اللعبة مستخبي هنا</p>
          <button
            onClick={() => setRevealed(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground py-4 px-8 rounded-xl text-lg font-semibold transition-colors"
          >
            اكشف دورك
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            تأكد إن محدش شايف الشاشة غيرك
          </p>
        </div>
      ) : (
        <div className="text-center max-w-sm">
          <div
            className={`text-7xl mb-4 ${
              isMafioso ? "animate-pulse" : ""
            }`}
          >
            {isMafioso ? "🔪" : "😇"}
          </div>
          <h2
            className={`text-3xl font-bold mb-2 ${
              isMafioso ? "text-danger" : "text-success"
            }`}
          >
            {isMafioso ? "أنت المافيوزو" : "أنت بريء"}
          </h2>

          {character && (
            <div className="bg-card border border-border rounded-xl p-4 mt-6 mb-4">
              <h3 className="font-semibold text-lg mb-1">{character.character_name}</h3>
              <p className="text-muted-foreground text-sm">{character.public_profile}</p>
            </div>
          )}

          {isMafioso && partnerNames.length > 0 && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 mt-3 mb-4">
              <p className="text-sm text-danger-foreground">
                شريكك في الجريمة: <strong>{partnerNames.join("، ")}</strong>
              </p>
            </div>
          )}

          <button
            onClick={onContinue}
            disabled={!isHost}
            className={`mt-6 bg-card border border-border text-foreground py-3 px-8 rounded-xl font-semibold transition-colors ${isHost ? "hover:bg-card/80" : "opacity-50 cursor-not-allowed"}`}
          >
            فهمت، كمّل
          </button>
          {!isHost && (
            <p className="text-xs text-muted-foreground mt-2">مستني المضيف يكمّل...</p>
          )}
        </div>
      )}
    </div>
  );
}
