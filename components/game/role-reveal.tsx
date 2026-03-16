"use client";

import { useState } from "react";
import { AVATAR_OPTIONS } from "@/types/game";
import type { RoomPlayer, CaseCharacter } from "@/types/database";

interface RoleRevealProps {
  player: RoomPlayer;
  character: CaseCharacter | null;
  partnerNames: string[];
  allPlayers: RoomPlayer[];
  allCharacters: CaseCharacter[];
  isHost: boolean;
  onContinue: () => void;
}

export function RoleReveal({
  player,
  character,
  partnerNames,
  allPlayers,
  allCharacters,
  isHost,
  onContinue,
}: RoleRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);
  const isMafioso = player.assigned_role === "mafioso";

  // Build player-to-character mapping for all players
  const playerCharacterMap = allPlayers.map((p) => {
    const char = allCharacters.find((c) => c.id === p.assigned_character_id);
    const av = AVATAR_OPTIONS.find((a) => a.id === p.avatar);
    return {
      playerId: p.id,
      nickname: p.nickname,
      emoji: av?.emoji ?? "🎭",
      characterName: char?.character_name ?? "???",
      characterProfile: char?.public_profile ?? "",
      isMe: p.id === player.id,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
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
        <div className="w-full max-w-sm">
          {/* Your role */}
          <div className="text-center mb-6">
            <div
              className={`text-6xl mb-3 ${
                isMafioso ? "animate-pulse" : ""
              }`}
            >
              {isMafioso ? "🔪" : "😇"}
            </div>
            <h2
              className={`text-2xl font-bold mb-1 ${
                isMafioso ? "text-danger" : "text-success"
              }`}
            >
              {isMafioso ? "أنت المافيوزو" : "أنت بريء"}
            </h2>
          </div>

          {/* Your character */}
          {character && (
            <div className={`rounded-xl p-4 mb-4 border ${
              isMafioso
                ? "bg-danger/10 border-danger/30"
                : "bg-success/10 border-success/30"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{avatar?.emoji ?? "🎭"}</span>
                <span className="font-bold">{player.nickname}</span>
                <span className={`text-xs px-2 py-0.5 rounded-lg ${
                  isMafioso ? "bg-danger/20 text-danger" : "bg-success/20 text-success"
                }`}>أنت</span>
              </div>
              <h3 className="font-semibold text-accent">{character.character_name}</h3>
              <p className="text-muted-foreground text-sm">{character.public_profile}</p>
            </div>
          )}

          {/* Mafioso partner info */}
          {isMafioso && partnerNames.length > 0 && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 mb-4">
              <p className="text-sm text-danger-foreground">
                شريكك في الجريمة: <strong>{partnerNames.join("، ")}</strong>
              </p>
            </div>
          )}

          {/* All other players and their characters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              باقي اللاعبين وشخصياتهم:
            </h3>
            <div className="space-y-2">
              {playerCharacterMap
                .filter((p) => !p.isMe)
                .map((p) => (
                  <div
                    key={p.playerId}
                    className="bg-card border border-border rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="font-semibold text-sm">{p.nickname}</span>
                    </div>
                    <p className="text-accent text-sm font-medium">{p.characterName}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">{p.characterProfile}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={onContinue}
            disabled={!isHost}
            className={`w-full bg-card border border-border text-foreground py-3 rounded-xl font-semibold transition-colors ${isHost ? "hover:bg-card/80" : "opacity-50 cursor-not-allowed"}`}
          >
            فهمت، كمّل
          </button>
          {!isHost && (
            <p className="text-xs text-muted-foreground mt-2 text-center">مستني المضيف يكمّل...</p>
          )}
        </div>
      )}
    </div>
  );
}
