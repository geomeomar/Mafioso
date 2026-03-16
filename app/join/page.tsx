"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { joinRoom } from "@/lib/supabase/rooms";
import { AvatarSelector } from "@/components/ui/avatar-selector";
import type { AvatarId } from "@/types/game";

export default function JoinRoom() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("suspect");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    setIsJoining(true);
    setError("");

    const supabase = createClient();
    const result = await joinRoom(supabase, roomCode.trim(), nickname.trim(), avatar);

    if ("error" in result) {
      setError(result.error);
      setIsJoining(false);
      return;
    }

    // Store player ID in sessionStorage
    sessionStorage.setItem("playerId", result.player.id);
    sessionStorage.setItem("roomId", result.room.id);

    router.push(`/room/${roomCode.toUpperCase()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <a href="/" className="text-muted-foreground text-sm mb-4 hover:text-foreground">
        → الرئيسية
      </a>
      <h1 className="text-3xl font-bold mb-8">ادخل أوضة</h1>

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
          <label className="block text-muted-foreground mb-2 text-sm">كود الأوضة</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="مثال: ABC123"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent text-center tracking-widest text-xl"
            maxLength={6}
          />
        </div>

        <AvatarSelector selected={avatar} onSelect={setAvatar} />

        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={!nickname.trim() || !roomCode.trim() || isJoining}
          className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          {isJoining ? "جاري الدخول..." : "ادخل الأوضة"}
        </button>
      </div>
    </div>
  );
}
