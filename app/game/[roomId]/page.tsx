"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { advanceGameState } from "@/lib/supabase/rooms";
import {
  getNextState,
  getEvidenceForRound,
  getJailedPlayerId,
  allMafiosoCaught,
  determineWinner,
} from "@/lib/game-engine";
import { RoleReveal } from "@/components/game/role-reveal";
import { CaseIntro } from "@/components/game/case-intro";
import { EvidenceReveal } from "@/components/game/evidence-reveal";
import { DiscussionTimer } from "@/components/game/discussion-timer";
import { VotingScreen } from "@/components/game/voting-screen";
import { JailReveal } from "@/components/game/jail-reveal";
import { GameResult } from "@/components/game/game-result";
import type { Room, RoomPlayer, Case, CaseCharacter, GameState, RoomVote } from "@/types/database";

export default function GameScreen() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [characters, setCharacters] = useState<CaseCharacter[]>([]);
  const [votes, setVotes] = useState<RoomVote[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [jailedPlayer, setJailedPlayer] = useState<RoomPlayer | null>(null);
  const [wasTie, setWasTie] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const supabase = createClient();

  // Initial data load
  useEffect(() => {
    const playerId = sessionStorage.getItem("playerId");
    setCurrentPlayerId(playerId);

    async function loadGameData() {
      // Load room
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (!roomData) return;
      setRoom(roomData as Room);

      // Load players
      const { data: playersData } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomId)
        .order("seat_number");
      setPlayers((playersData as RoomPlayer[]) ?? []);

      // Load case
      if (roomData.case_id) {
        const { data: cd } = await supabase
          .from("cases")
          .select("*")
          .eq("id", roomData.case_id)
          .single();
        if (cd) setCaseData(cd as Case);

        const { data: chars } = await supabase
          .from("case_characters")
          .select("*")
          .eq("case_id", roomData.case_id)
          .order("character_order");
        setCharacters((chars as CaseCharacter[]) ?? []);
      }

      // Load votes for current round
      const { data: votesData } = await supabase
        .from("room_votes")
        .select("*")
        .eq("room_id", roomId);
      setVotes((votesData as RoomVote[]) ?? []);
    }

    loadGameData();
  }, [roomId, supabase]);

  // Realtime subscriptions
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as Room);
          setHasVoted(false); // Reset vote status on state change
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => {
          supabase
            .from("room_players")
            .select("*")
            .eq("room_id", roomId)
            .order("seat_number")
            .then(({ data }) => {
              if (data) setPlayers(data as RoomPlayer[]);
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_votes", filter: `room_id=eq.${roomId}` },
        () => {
          supabase
            .from("room_votes")
            .select("*")
            .eq("room_id", roomId)
            .then(({ data }) => {
              if (data) setVotes(data as RoomVote[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  // Check if all votes are in and process results
  useEffect(() => {
    if (!room || !currentPlayerId) return;
    if (room.current_state !== "round_vote" && room.current_state !== "final_vote") return;

    const alivePlayers = players.filter((p) => p.is_alive);
    const roundVotes = votes.filter((v) => v.round_number === room.current_round);

    // Check if all alive players voted
    const allVoted = alivePlayers.every((p) =>
      roundVotes.some((v) => v.voter_player_id === p.id)
    );

    if (!allVoted) return;

    // Only host processes vote results
    if (room.host_player_id !== currentPlayerId) return;

    const jailedId = getJailedPlayerId(roundVotes);

    if (jailedId) {
      // Jail the player
      supabase
        .from("room_players")
        .update({ is_alive: false })
        .eq("id", jailedId)
        .then(() => {
          // Check win condition
          const updatedPlayers = players.map((p) =>
            p.id === jailedId ? { ...p, is_alive: false } : p
          );
          const caught = allMafiosoCaught(updatedPlayers);
          const nextState = getNextState(
            room.current_state,
            room.current_round,
            room.player_count_mode as 3 | 5,
            caught
          );
          advanceGameState(supabase, roomId, nextState,
            nextState === "round_evidence" ? room.current_round + 1 : undefined
          );
        });
    } else {
      // Tie — advance without jailing
      setWasTie(true);
      const nextState = getNextState(
        room.current_state,
        room.current_round,
        room.player_count_mode as 3 | 5,
        false
      );
      advanceGameState(supabase, roomId, nextState,
        nextState === "round_evidence" ? room.current_round + 1 : undefined
      );
    }
  }, [votes, room, players, currentPlayerId, roomId, supabase]);

  const handleAdvance = useCallback(
    async (nextState?: GameState) => {
      if (!room || room.host_player_id !== currentPlayerId) return;

      const state =
        nextState ??
        getNextState(
          room.current_state,
          room.current_round,
          room.player_count_mode as 3 | 5,
          allMafiosoCaught(players)
        );

      await advanceGameState(
        supabase,
        roomId,
        state,
        state === "round_evidence" ? room.current_round + 1 : undefined
      );
    },
    [room, currentPlayerId, players, supabase, roomId]
  );

  const handleVote = async (targetPlayerId: string) => {
    if (!room || !currentPlayerId) return;
    setHasVoted(true);
    await supabase.from("room_votes").insert({
      room_id: roomId,
      round_number: room.current_round,
      voter_player_id: currentPlayerId,
      target_player_id: targetPlayerId,
    });
  };

  // Render based on game state
  if (!room || !currentPlayerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const myCharacter = characters.find(
    (c) => c.id === currentPlayer?.assigned_character_id
  );
  const isHost = room.host_player_id === currentPlayerId;

  // Mafioso partners (for 5-player mode)
  const partnerNames = players
    .filter(
      (p) =>
        p.assigned_role === "mafioso" &&
        p.id !== currentPlayerId
    )
    .map((p) => p.nickname);

  switch (room.current_state) {
    case "assigning_roles":
      return (
        <RoleReveal
          player={currentPlayer!}
          character={myCharacter ?? null}
          partnerNames={currentPlayer?.assigned_role === "mafioso" ? partnerNames : []}
          onContinue={() => {
            if (isHost) handleAdvance("case_intro");
          }}
        />
      );

    case "case_intro":
      return caseData ? (
        <CaseIntro
          caseData={caseData}
          onContinue={() => {
            if (isHost) handleAdvance("round_evidence");
          }}
        />
      ) : null;

    case "round_evidence":
      return caseData ? (
        <EvidenceReveal
          roundNumber={room.current_round}
          evidenceText={getEvidenceForRound(room.current_round, caseData)}
          onContinue={() => {
            if (isHost) handleAdvance("round_discussion");
          }}
        />
      ) : null;

    case "round_discussion":
      return (
        <DiscussionTimer
          roundNumber={room.current_round}
          isFinal={false}
          onTimeUp={() => {
            if (isHost) handleAdvance("round_vote");
          }}
        />
      );

    case "final_discussion":
      return (
        <DiscussionTimer
          roundNumber={room.current_round}
          isFinal={true}
          onTimeUp={() => {
            if (isHost) handleAdvance("final_vote");
          }}
        />
      );

    case "round_vote":
    case "final_vote": {
      const alivePlayers = players.filter((p) => p.is_alive);
      const roundVotes = votes.filter((v) => v.round_number === room.current_round);
      const playersWhoVoted = new Set(roundVotes.map((v) => v.voter_player_id));
      const waitingCount = alivePlayers.filter((p) => !playersWhoVoted.has(p.id)).length;

      return (
        <VotingScreen
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          roundNumber={room.current_round}
          isRevote={false}
          onVote={handleVote}
          hasVoted={hasVoted || playersWhoVoted.has(currentPlayerId)}
          waitingCount={waitingCount}
        />
      );
    }

    case "round_reveal": {
      const roundVotes = votes.filter((v) => v.round_number === room.current_round);
      const jailedId = getJailedPlayerId(roundVotes);
      const jailed = jailedId ? players.find((p) => p.id === jailedId) ?? null : null;

      return (
        <JailReveal
          jailedPlayer={jailed}
          wasTie={!jailed}
          onContinue={() => {
            if (isHost) handleAdvance();
          }}
        />
      );
    }

    case "game_result":
      return caseData ? (
        <GameResult
          winner={determineWinner(players)}
          players={players}
          caseData={caseData}
          currentPlayerId={currentPlayerId}
        />
      ) : null;

    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      );
  }
}
