"use client";

import { useEffect, useState } from "react";
import { DISCUSSION_TIMER_SECONDS } from "@/types/game";

interface DiscussionTimerProps {
  roundNumber: number;
  isFinal: boolean;
  isHost: boolean;
  onTimeUp: () => void;
}

export function DiscussionTimer({ roundNumber, isFinal, isHost, onTimeUp }: DiscussionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(DISCUSSION_TIMER_SECONDS);

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
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full text-center">
        <span className="text-sm text-muted-foreground mb-2 block">
          {isFinal ? "النقاش النهائي" : `نقاش الجولة ${roundNumber}`}
        </span>

        <h2 className="text-xl font-bold mb-8">مين فيكم شاكك فيه؟</h2>

        {/* Timer circle */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${(2 * Math.PI * 45 * progress) / 100}`}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${
                isUrgent ? "text-danger" : "text-accent"
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-4xl font-mono font-bold ${
                isUrgent ? "text-danger animate-pulse" : "text-foreground"
              }`}
            >
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          اتكلموا مع بعض واتناقشوا... مين المافيوزو؟
        </p>

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
  );
}
