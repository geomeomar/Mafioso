"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { joinRoom } from "@/lib/supabase/rooms";
import { AvatarSelector } from "@/components/ui/avatar-selector";
import type { AvatarId } from "@/types/game";

/**
 * Quick-join page for invite links: /room/[code]/join
 * Shows nickname + avatar form, then joins the room.
 */
export default function QuickJoin() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("suspect");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!nickname.trim()) return;
    setIsJoining(true);
    setError("");

    const supabase = createClient();
    const result = await joinRoom(supabase, roomCode, nickname.trim(), avatar);

    if ("error" in result) {
      setError(result.error);
      setIsJoining(false);
      return;
    }

    sessionStorage.setItem("playerId", result.player.id);
    sessionStorage.setItem("roomId", result.room.id);
    router.push(`/room/${roomCode}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-3xl font-bold mb-2">ادخل الأوضة</h1>
      <p className="text-muted-foreground mb-8">كود الأوضة: <span className="text-accent font-mono">{roomCode}</span></p>

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

        <AvatarSelector selected={avatar} onSelect={setAvatar} />

        {error && <p className="text-danger text-sm text-center">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={!nickname.trim() || isJoining}
          className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground py-4 rounded-xl text-lg font-semibold transition-colors"
        >
          {isJoining ? "جاري الدخول..." : "ادخل الأوضة"}
        </button>
      </div>
    </div>
  );
}
