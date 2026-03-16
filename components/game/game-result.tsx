"use client";

import type { Case, RoomPlayer } from "@/types/database";
import { AVATAR_OPTIONS } from "@/types/game";

interface GameResultProps {
  winner: "mafioso" | "innocent";
  players: RoomPlayer[];
  caseData: Case;
  currentPlayerId: string;
}

export function GameResult({ winner, players, caseData, currentPlayerId }: GameResultProps) {
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const playerWon =
    (winner === "mafioso" && currentPlayer?.assigned_role === "mafioso") ||
    (winner === "innocent" && currentPlayer?.assigned_role === "innocent");

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8">
      <div className="max-w-md w-full">
        {/* Winner announcement */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">
            {winner === "innocent" ? "🎉" : "💀"}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {winner === "innocent" ? "الأبرياء كسبوا!" : "المافيوزو كسبوا!"}
          </h1>
          <p
            className={`text-lg font-semibold ${
              playerWon ? "text-success" : "text-danger"
            }`}
          >
            {playerWon ? "أنت كسبت! 🎊" : "أنت خسرت 😔"}
          </p>
        </div>

        {/* All players revealed */}
        <div className="mb-8">
          <h3 className="text-sm text-muted-foreground mb-3 text-center">كل اللاعبين</h3>
          <div className="space-y-2">
            {players.map((player) => {
              const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);
              const isMafioso = player.assigned_role === "mafioso";
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isMafioso
                      ? "border-danger/30 bg-danger/5"
                      : "border-success/30 bg-success/5"
                  }`}
                >
                  <span className="text-2xl">{avatar?.emoji ?? "🎭"}</span>
                  <div className="flex-1">
                    <span className="font-semibold">{player.nickname}</span>
                    {player.id === currentPlayerId && (
                      <span className="text-xs text-muted-foreground mr-1"> (أنت)</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isMafioso ? "text-danger" : "text-success"
                    }`}
                  >
                    {isMafioso ? "مافيوزو 🔪" : "بريء 😇"}
                  </span>
                  {!player.is_alive && (
                    <span className="text-xs text-muted-foreground">محبوس</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Final truth */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h3 className="font-bold mb-3 text-accent">الحقيقة الكاملة</h3>
          <p className="text-foreground leading-relaxed text-sm whitespace-pre-line">
            {caseData.final_truth}
          </p>
        </div>

        {/* Play again */}
        <a
          href="/"
          className="block w-full bg-accent hover:bg-accent/90 text-accent-foreground text-center py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          العب تاني
        </a>
      </div>
    </div>
  );
}
