"use client";

import { AVATAR_OPTIONS } from "@/types/game";
import type { RoomPlayer } from "@/types/database";

interface PlayerCardProps {
  player: RoomPlayer;
  isHost: boolean;
  isCurrentPlayer: boolean;
}

export function PlayerCard({ player, isHost, isCurrentPlayer }: PlayerCardProps) {
  const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        player.is_ready
          ? "border-success/50 bg-success/5"
          : "border-border bg-card"
      } ${isCurrentPlayer ? "ring-2 ring-accent/30" : ""}`}
    >
      <div className="text-3xl">{avatar?.emoji ?? "🎭"}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{player.nickname}</span>
          {isHost && (
            <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">
              المضيف
            </span>
          )}
          {isCurrentPlayer && (
            <span className="text-xs text-muted-foreground">(أنت)</span>
          )}
        </div>
        <span className={`text-xs ${player.is_ready ? "text-success" : "text-muted-foreground"}`}>
          {player.is_ready ? "جاهز ✓" : "مستني..."}
        </span>
      </div>
    </div>
  );
}
