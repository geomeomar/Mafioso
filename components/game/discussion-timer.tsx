"use client";

import { useEffect, useState } from "react";
import { DISCUSSION_TIMER_SECONDS, AVATAR_OPTIONS } from "@/types/game";
import { useVoiceChat } from "@/lib/webrtc/use-voice-chat";
import type { RoomPlayer, CaseCharacter } from "@/types/database";

interface DiscussionTimerProps {
  roundNumber: number;
  isFinal: boolean;
  isHost: boolean;
  onTimeUp: () => void;
  roomId: string;
  currentPlayerId: string | null;
  allPlayers: RoomPlayer[];
  allCharacters: CaseCharacter[];
  accumulatedEvidence: string[];
}

export function DiscussionTimer({
  roundNumber,
  isFinal,
  isHost,
  onTimeUp,
  roomId,
  currentPlayerId,
  allPlayers,
  allCharacters,
  accumulatedEvidence,
}: DiscussionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(DISCUSSION_TIMER_SECONDS);
  const [showInfo, setShowInfo] = useState(true);
  const { isMicOn, toggleMic, connectedPeers, error } = useVoiceChat(roomId, currentPlayerId, true);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft <= 15;
  const progress = ((DISCUSSION_TIMER_SECONDS - secondsLeft) / DISCUSSION_TIMER_SECONDS) * 100;

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6">
      <div className="max-w-lg w-full">
        <span className="text-sm text-muted-foreground mb-1 block text-center">
          {isFinal ? "النقاش النهائي" : `نقاش الجولة ${roundNumber}`}
        </span>

        <h2 className="text-xl font-bold mb-4 text-center">مين فيكم شاكك فيه؟</h2>

        {/* Timer + Mic row */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${(2 * Math.PI * 45 * progress) / 100}`}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${isUrgent ? "text-danger" : "text-accent"}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-mono font-bold ${isUrgent ? "text-danger animate-pulse" : "text-foreground"}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          <button
            onClick={toggleMic}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isMicOn
                ? "bg-danger/20 text-danger border-2 border-danger/40 animate-pulse"
                : "bg-card border-2 border-border text-foreground hover:bg-card/80"
            }`}
          >
            <span className="text-lg">{isMicOn ? "🎙️" : "🔇"}</span>
            {isMicOn ? "شغال" : "فتح المايك"}
          </button>
        </div>

        {(isMicOn || error) && (
          <div className="text-center text-xs mb-3">
            {isMicOn && connectedPeers > 0 && <p className="text-success">متوصل مع {connectedPeers} لاعب 🟢</p>}
            {isMicOn && connectedPeers === 0 && <p className="text-muted-foreground">مستني لاعبين تانيين...</p>}
            {error && <p className="text-danger">{error}</p>}
          </div>
        )}

        {/* Toggle info panel */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full text-center text-sm text-muted-foreground mb-3 flex items-center justify-center gap-1"
        >
          {showInfo ? "▲ إخفي التفاصيل" : "▼ عرض اللاعبين والأدلة"}
        </button>

        {showInfo && (
          <div className="space-y-3 mb-4">
            {/* Players & Characters */}
            <div className="bg-card border border-border rounded-xl p-3">
              <h3 className="text-sm font-bold text-accent mb-2">👥 اللاعبين</h3>
              <div className="space-y-2">
                {allPlayers.map((player) => {
                  const char = allCharacters.find((c) => c.id === player.assigned_character_id);
                  const avatar = AVATAR_OPTIONS.find((a) => a.id === player.avatar);
                  const isMe = player.id === currentPlayerId;
                  return (
                    <div
                      key={player.id}
                      className={`flex items-start gap-2 p-2 rounded-lg ${
                        !player.is_alive ? "opacity-40 line-through" : ""
                      } ${isMe ? "bg-accent/10 border border-accent/20" : "bg-background/50"}`}
                    >
                      <span className="text-lg">{avatar?.emoji ?? "🎭"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm">{player.nickname}</span>
                          {isMe && <span className="text-xs text-accent">(أنت)</span>}
                          {!player.is_alive && <span className="text-xs text-danger">محبوس</span>}
                        </div>
                        {char && (
                          <p className="text-xs text-muted-foreground leading-tight">
                            <span className="font-semibold text-foreground/80">{char.character_name}</span>
                            {" — "}
                            {char.public_profile}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accumulated Evidence */}
            <div className="bg-card border border-border rounded-xl p-3">
              <h3 className="text-sm font-bold text-accent mb-2">🔍 الأدلة</h3>
              {accumulatedEvidence.map((evidence, idx) => (
                <div key={idx} className="mb-2 last:mb-0">
                  <span className="text-xs font-bold text-warning">جولة {idx + 1}:</span>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {evidence.split(";").map((clue, i) => (
                      <span key={i} className="block">• {clue.trim()}</span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="text-center">
          <button
            onClick={onTimeUp}
            disabled={!isHost}
            className={`text-accent-foreground py-3 px-8 rounded-xl font-semibold transition-colors ${isHost ? "bg-accent hover:bg-accent/90" : "bg-accent/50 opacity-50 cursor-not-allowed"}`}
          >
            خلصنا نقاش — صوّت دلوقتي
          </button>
          {!isHost && (
            <p className="text-xs text-muted-foreground mt-2">مستني المضيف يكمّل...</p>
          )}
        </div>
      </div>
    </div>
  );
}
