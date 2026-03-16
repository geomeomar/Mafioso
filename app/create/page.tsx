"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createRoom, joinRoom } from "@/lib/supabase/rooms";
import { AvatarSelector } from "@/components/ui/avatar-selector";
import type { AvatarId } from "@/types/game";

export default function CreateRoom() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [playerCount, setPlayerCount] = useState<3 | 5>(3);
  const [avatar, setAvatar] = useState<AvatarId>("detective");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!nickname.trim()) return;
    setIsCreating(true);
    setError("");

    const supabase = createClient();

    // Create room
    const result = await createRoom(supabase, playerCount);
    if ("error" in result) {
      setError(result.error);
      setIsCreating(false);
      return;
    }

    // Join as host
    const joinResult = await joinRoom(supabase, result.roomCode, nickname.trim(), avatar);
    if ("error" in joinResult) {
      setError(joinResult.error);
      setIsCreating(false);
      return;
    }

    // Store player ID in sessionStorage for this session
    sessionStorage.setItem("playerId", joinResult.player.id);
    sessionStorage.setItem("roomId", joinResult.room.id);

    // Redirect to lobby
    router.push(`/room/${result.roomCode}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <a href="/" className="text-muted-foreground text-sm mb-4 hover:text-foreground">
        → الرئيسية
      </a>
      <h1 className="text-3xl font-bold mb-8">أنشئ أوضة جديدة</h1>

      <div className="w-full max-w-sm space-y-6">
        <div>
          <label className="block text-muted-foreground mb-2 text-sm">اسمك</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="اكتب اسمك هنا..."
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-muted-foreground mb-2 text-sm">عدد اللاعبين</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPlayerCount(3)}
              className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                playerCount === 3
                  ? "bg-accent text-accent-foreground"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              ٣ لاعبين
            </button>
            <button
              onClick={() => setPlayerCount(5)}
              className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                playerCount === 5
                  ? "bg-accent text-accent-foreground"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              ٥ لاعبين
            </button>
          </div>
        </div>

        <AvatarSelector selected={avatar} onSelect={setAvatar} />

        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={!nickname.trim() || isCreating}
          className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          {isCreating ? "جاري الإنشاء..." : "ابدأ الأوضة"}
        </button>
      </div>
    </div>
  );
}
