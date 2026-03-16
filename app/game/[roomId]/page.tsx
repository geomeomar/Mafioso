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
  checkAccusation,
  getLastJailedInnocent,
} from "@/lib/game-engine";
import { RoleReveal } from "@/components/game/role-reveal";
import { CaseIntro } from "@/components/game/case-intro";
import { EvidenceReveal } from "@/components/game/evidence-reveal";
import { DiscussionTimer } from "@/components/game/discussion-timer";
import { VotingScreen } from "@/components/game/voting-screen";
import { JailReveal } from "@/components/game/jail-reveal";
import { FinalAccusation } from "@/components/game/final-accusation";
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
  const [hasVoted, setHasVoted] = useState(false);
  const [hasAccused, setHasAccused] = useState(false);
  const [accusationWinner, setAccusationWinner] = useState<"innocent" | "mafioso" | null>(null);

  const supabase = createClient();

  // Initial data load
  useEffect(() => {
    const playerId = sessionStorage.getItem("playerId");
    setCurrentPlayerId(playerId);

    async function loadGameData() {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (!roomData) return;
      setRoom(roomData as Room);

      const { data: playersData } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomId)
        .order("seat_number");
      setPlayers((playersData as RoomPlayer[]) ?? []);

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
          setHasVoted(false);
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

  // Vote processing: when all votes are in, advance to round_reveal
  useEffect(() => {
    if (!room || !currentPlayerId) return;
    if (room.current_state !== "round_vote") return;

    const alivePlayers = players.filter((p) => p.is_alive);
    const roundVotes = votes.filter((v) => v.round_number === room.current_round);

    const allVoted = alivePlayers.every((p) =>
      roundVotes.some((v) => v.voter_player_id === p.id)
    );
    if (!allVoted) return;

    // Only host processes
    if (room.host_player_id !== currentPlayerId) return;

    const jailedId = getJailedPlayerId(roundVotes);

    if (jailedId) {
      // Jail the player, then go to round_reveal (NOT beyond it)
      supabase
        .from("room_players")
        .update({ is_alive: false })
        .eq("id", jailedId)
        .then(() => {
          advanceGameState(supabase, roomId, "round_reveal");
        });
    } else {
      // Tie — go to round_reveal (JailReveal will show tie message)
      advanceGameState(supabase, roomId, "round_reveal");
    }
  }, [votes, room, players, currentPlayerId, roomId, supabase]);

  // handleAdvance: host advances from current state to next
  const handleAdvance = useCallback(
    async (nextState?: GameState) => {
      if (!room || room.host_player_id !== currentPlayerId) return;

      let state = nextState;
      if (!state) {
        // Re-fetch players to get the latest is_alive status
        // (critical for round_reveal → deciding next state)
        let latestPlayers = players;
        if (room.current_state === "round_reveal") {
          const { data: freshPlayers } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_id", roomId)
            .order("seat_number");
          if (freshPlayers) {
            latestPlayers = freshPlayers as RoomPlayer[];
            setPlayers(latestPlayers);
          }
        }

        state = getNextState(
          room.current_state,
          room.current_round,
          room.player_count_mode as 3 | 5,
          allMafiosoCaught(latestPlayers)
        );
      }

      // Only increment round when looping back from round_reveal → round_evidence
      // (NOT when going from case_intro → round_evidence, since startGame already sets round to 1)
      const shouldIncrementRound =
        state === "round_evidence" && room.current_state === "round_reveal";

      await advanceGameState(
        supabase,
        roomId,
        state,
        shouldIncrementRound ? room.current_round + 1 : undefined
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

  const handleAccusation = async (targetPlayerId: string) => {
    if (!room || !currentPlayerId) return;
    setHasAccused(true);
    const winner = checkAccusation(targetPlayerId, players);
    setAccusationWinner(winner);
    // Store result as event, then advance to game_result
    await supabase.from("room_events").insert({
      room_id: roomId,
      event_type: "final_accusation",
      payload_json: { accuser_id: currentPlayerId, target_id: targetPlayerId, winner },
    });
    // Mark accused as jailed if they were mafioso
    if (winner === "innocent") {
      await supabase
        .from("room_players")
        .update({ is_alive: false })
        .eq("id", targetPlayerId);
    }
    await advanceGameState(supabase, roomId, "game_result");
  };

  // Render
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  if (!room || !currentPlayerId || !currentPlayer || players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  const myCharacter = characters.find(
    (c) => c.id === currentPlayer.assigned_character_id
  );
  const isHost = room.host_player_id === currentPlayerId;

  const partnerNames = players
    .filter((p) => p.assigned_role === "mafioso" && p.id !== currentPlayerId)
    .map((p) => p.nickname);

  switch (room.current_state) {
    case "assigning_roles":
      return (
        <RoleReveal
          player={currentPlayer}
          character={myCharacter ?? null}
          partnerNames={currentPlayer?.assigned_role === "mafioso" ? partnerNames : []}
          isHost={isHost}
          onContinue={() => handleAdvance("case_intro")}
        />
      );

    case "case_intro":
      return caseData ? (
        <CaseIntro
          caseData={caseData}
          isHost={isHost}
          onContinue={() => handleAdvance("round_evidence")}
        />
      ) : null;

    case "round_evidence":
      return caseData ? (
        <EvidenceReveal
          roundNumber={room.current_round}
          evidenceText={getEvidenceForRound(room.current_round, caseData)}
          isHost={isHost}
          onContinue={() => handleAdvance("round_discussion")}
          playerNickname={currentPlayer.nickname}
          characterName={myCharacter?.character_name ?? null}
          characterProfile={myCharacter?.public_profile ?? null}
          playerRole={currentPlayer.assigned_role}
        />
      ) : null;

    case "round_discussion":
      return (
        <DiscussionTimer
          roundNumber={room.current_round}
          isFinal={false}
          isHost={isHost}
          onTimeUp={() => handleAdvance("round_vote")}
        />
      );

    case "round_vote": {
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
      // Find the jailed player — they may already have is_alive=false from vote processing
      const jailed = jailedId ? players.find((p) => p.id === jailedId) ?? null : null;
      const jailedIsMafioso = jailed?.assigned_role === "mafioso";

      return (
        <JailReveal
          jailedPlayer={jailed}
          wasTie={!jailed}
          isHost={isHost}
          onContinue={() => handleAdvance()}
          extraMessage={
            jailedIsMafioso && room.player_count_mode === 5
              ? (() => {
                  const remainingMafioso = players.filter(
                    (p) => p.assigned_role === "mafioso" && p.is_alive && p.id !== jailedId
                  );
                  return remainingMafioso.length > 0
                    ? "لسه في مافيوزو تاني!"
                    : undefined;
                })()
              : undefined
          }
        />
      );
    }

    case "final_accusation": {
      const lastJailed = getLastJailedInnocent(players);
      const alivePlayers = players.filter((p) => p.is_alive);

      if (!lastJailed) {
        // Edge case: no jailed innocent (shouldn't happen normally)
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        );
      }

      return (
        <FinalAccusation
          accuserPlayer={lastJailed}
          alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId}
          onAccuse={handleAccusation}
          hasAccused={hasAccused}
        />
      );
    }

    case "game_result":
      return caseData ? (
        <GameResult
          winner={accusationWinner ?? determineWinner(players)}
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
