"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startGame } from "@/lib/supabase/rooms";
import { PlayerCard } from "@/components/lobby/player-card";
import type { Room, RoomPlayer } from "@/types/database";

export default function RoomLobby() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  // Load room and players
  useEffect(() => {
    const playerId = sessionStorage.getItem("playerId");
    setCurrentPlayerId(playerId);

    async function loadRoom() {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (!roomData) {
        setError("الأوضة مش موجودة");
        return;
      }
      setRoom(roomData as Room);

      const { data: playersData } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomData.id)
        .order("seat_number");

      setPlayers((playersData as RoomPlayer[]) ?? []);
    }

    loadRoom();
  }, [roomCode, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` },
        () => {
          // Reload players on any change
          supabase
            .from("room_players")
            .select("*")
            .eq("room_id", room.id)
            .order("seat_number")
            .then(({ data }) => {
              if (data) setPlayers(data as RoomPlayer[]);
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as Room;
          setRoom(updated);
          // If game started, redirect to game screen
          if (updated.status === "playing") {
            router.push(`/game/${room.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, supabase, router]);

  const isHost = room?.host_player_id === currentPlayerId;
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const allReady = players.length > 0 && players.every((p) => p.is_ready);
  const roomFull = players.length === room?.player_count_mode;

  const toggleReady = useCallback(async () => {
    if (!currentPlayerId) return;
    await supabase
      .from("room_players")
      .update({ is_ready: !currentPlayer?.is_ready })
      .eq("id", currentPlayerId);
  }, [currentPlayerId, currentPlayer?.is_ready, supabase]);

  const handleStart = async () => {
    if (!room?.id) return;
    setIsStarting(true);
    const result = await startGame(supabase, room.id);
    if ("error" in result) {
      setError(result.error);
      setIsStarting(false);
    }
    // Realtime will handle redirect
  };

  const shareLink = typeof window !== "undefined"
    ? `${window.location.origin}/room/${roomCode}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error && !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-danger text-lg mb-4">{error}</p>
        <a href="/" className="text-accent hover:underline">ارجع للرئيسية</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8">
      <div className="w-full max-w-md">
        {/* Room header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">الأوضة</h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl font-mono tracking-widest text-accent font-bold">
              {roomCode}
            </span>
          </div>
          <button
            onClick={copyLink}
            className="text-sm text-muted-foreground hover:text-foreground bg-card border border-border px-4 py-2 rounded-lg transition-colors"
          >
            {copied ? "تم النسخ ✓" : "انسخ لينك الدعوة"}
          </button>
        </div>

        {/* Player count */}
        <div className="text-center mb-4">
          <span className="text-muted-foreground text-sm">
            {players.length} / {room?.player_count_mode ?? "?"} لاعبين
          </span>
        </div>

        {/* Players list */}
        <div className="space-y-3 mb-8">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isHost={player.id === room?.host_player_id}
              isCurrentPlayer={player.id === currentPlayerId}
            />
          ))}

          {/* Empty seats */}
          {room && Array.from({ length: room.player_count_mode - players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center p-4 rounded-xl border border-dashed border-border text-muted-foreground"
            >
              مستني لاعب...
            </div>
          ))}
        </div>

        {error && (
          <p className="text-danger text-sm text-center mb-4">{error}</p>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {currentPlayer && (
            <button
              onClick={toggleReady}
              className={`w-full py-4 rounded-xl text-lg font-semibold transition-colors ${
                currentPlayer.is_ready
                  ? "bg-muted text-muted-foreground border border-border"
                  : "bg-success text-white"
              }`}
            >
              {currentPlayer.is_ready ? "مش جاهز" : "جاهز!"}
            </button>
          )}

          {isHost && roomFull && allReady && (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              {isStarting ? "جاري البدء..." : "ابدأ اللعبة!"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
