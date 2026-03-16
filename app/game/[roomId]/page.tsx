"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { advanceGameState } from "@/lib/supabase/rooms";
import {
  getNextState,
  getEvidenceForRound,
  getJailedPlayerId,
  getJailedPlayerIdForceResolve,
  getTiedPlayerIds,
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

  const supabase = useMemo(() => createClient(), []);
  const processingRef = useRef(false);

  // Helper: fetch fresh data from DB
  const fetchVotes = useCallback(async () => {
    const { data } = await supabase.from("room_votes").select("*").eq("room_id", roomId);
    if (data) setVotes(data as RoomVote[]);
    return (data ?? []) as RoomVote[];
  }, [supabase, roomId]);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from("room_players").select("*").eq("room_id", roomId).order("seat_number");
    if (data) setPlayers(data as RoomPlayer[]);
    return (data ?? []) as RoomPlayer[];
  }, [supabase, roomId]);

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (data) setRoom(data as Room);
    return data as Room | null;
  }, [supabase, roomId]);

  // Process votes: called after inserting a vote. Any player can trigger this.
  const processVotes = useCallback(async (currentRoom: Room) => {
    if (processingRef.current) return;

    const freshVotes = await fetchVotes();
    const freshPlayers = await fetchPlayers();
    const alivePlayers = freshPlayers.filter((p) => p.is_alive);

    const firstVotes = freshVotes.filter(
      (v) => v.round_number === currentRoom.current_round && !v.is_revote
    );
    const revoteVotes = freshVotes.filter(
      (v) => v.round_number === currentRoom.current_round && v.is_revote
    );

    // Check if all first votes are in
    const allFirstVoted = alivePlayers.every((p) =>
      firstVotes.some((v) => v.voter_player_id === p.id)
    );

    if (!allFirstVoted) return; // Not all voted yet

    // Check if first vote had a clear winner
    const firstJailed = getJailedPlayerId(firstVotes);

    if (firstJailed) {
      // Clear winner from first vote
      processingRef.current = true;
      await supabase.from("room_players").update({ is_alive: false }).eq("id", firstJailed);
      await advanceGameState(supabase, roomId, "round_reveal");
      processingRef.current = false;
      return;
    }

    // First vote was a tie — check if revote happened
    const allRevoted = alivePlayers.every((p) =>
      revoteVotes.some((v) => v.voter_player_id === p.id)
    );

    if (!allRevoted) {
      // Tie, but revote not done yet — advance to round_reveal to show tie
      if (revoteVotes.length === 0) {
        processingRef.current = true;
        await advanceGameState(supabase, roomId, "round_reveal");
        processingRef.current = false;
      }
      return;
    }

    // Revote is complete — force resolve (random on tie)
    const revoteJailed = getJailedPlayerIdForceResolve(revoteVotes);
    if (revoteJailed) {
      processingRef.current = true;
      await supabase.from("room_players").update({ is_alive: false }).eq("id", revoteJailed);
      await advanceGameState(supabase, roomId, "round_reveal");
      processingRef.current = false;
    }
  }, [supabase, roomId, fetchVotes, fetchPlayers]);

  // Initial data load
  useEffect(() => {
    const playerId = sessionStorage.getItem("playerId");
    setCurrentPlayerId(playerId);

    async function loadGameData() {
      const roomData = await fetchRoom();
      if (!roomData) return;

      await fetchPlayers();

      if (roomData.case_id) {
        const { data: cd } = await supabase
          .from("cases").select("*").eq("id", roomData.case_id).single();
        if (cd) setCaseData(cd as Case);

        const { data: chars } = await supabase
          .from("case_characters").select("*").eq("case_id", roomData.case_id).order("character_order");
        setCharacters((chars as CaseCharacter[]) ?? []);
      }

      await fetchVotes();
    }

    loadGameData();
  }, [roomId, supabase, fetchRoom, fetchPlayers, fetchVotes]);

  // Realtime: listen for room changes + player changes + vote changes
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`game-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => { setRoom(payload.new as Room); setHasVoted(false); })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => { fetchPlayers(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_votes", filter: `room_id=eq.${roomId}` },
        () => { fetchVotes(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase, fetchPlayers, fetchVotes]);

  // Poll during round_vote to catch missed realtime events
  useEffect(() => {
    if (!room || room.current_state !== "round_vote") return;
    const interval = setInterval(async () => {
      const freshRoom = await fetchRoom();
      if (freshRoom && freshRoom.current_state !== "round_vote") return; // Already advanced
      await fetchVotes();
      // Try to process if we have all votes
      if (freshRoom) processVotes(freshRoom);
    }, 2000);
    return () => clearInterval(interval);
  }, [room?.current_state, room?.current_round, fetchRoom, fetchVotes, processVotes]);

  // Derive revote info for UI rendering
  const revoteInfo = useMemo(() => {
    if (!room) return { isRevote: false, tiedPlayerIds: [] as string[] };
    const alivePlayers = players.filter((p) => p.is_alive);
    const firstVotes = votes.filter(
      (v) => v.round_number === room.current_round && !v.is_revote
    );
    const allFirstVoted = alivePlayers.length > 0 && alivePlayers.every((p) =>
      firstVotes.some((v) => v.voter_player_id === p.id)
    );
    const firstVoteTied = allFirstVoted && !getJailedPlayerId(firstVotes);
    const isRevote = room.current_state === "round_vote" && firstVoteTied;
    const tiedPlayerIds = firstVoteTied ? getTiedPlayerIds(firstVotes) : [];
    return { isRevote, tiedPlayerIds };
  }, [room, votes, players]);

  // Host advances game state
  const handleAdvance = useCallback(async (nextState?: GameState) => {
    if (!room || room.host_player_id !== currentPlayerId) return;

    let state = nextState;
    if (!state) {
      const latestPlayers = await fetchPlayers();
      state = getNextState(room.current_state, room.current_round,
        room.player_count_mode as 4 | 5, allMafiosoCaught(latestPlayers));
    }

    const shouldIncrementRound = state === "round_evidence" && room.current_state === "round_reveal";
    await advanceGameState(supabase, roomId, state,
      shouldIncrementRound ? room.current_round + 1 : undefined);
  }, [room, currentPlayerId, supabase, roomId, fetchPlayers]);

  // Revote
  const handleRevote = useCallback(async () => {
    if (!room || room.host_player_id !== currentPlayerId) return;
    setHasVoted(false);
    await advanceGameState(supabase, roomId, "round_vote");
  }, [room, currentPlayerId, supabase, roomId]);

  // Vote: insert vote, then immediately try to process
  const handleVote = async (targetPlayerId: string) => {
    if (!room || !currentPlayerId) return;
    setHasVoted(true);

    await supabase.from("room_votes").insert({
      room_id: roomId,
      round_number: room.current_round,
      voter_player_id: currentPlayerId,
      target_player_id: targetPlayerId,
      is_revote: revoteInfo.isRevote,
    });

    // Small delay to let DB settle, then try to process
    setTimeout(() => { processVotes(room); }, 500);
  };

  const handleAccusation = async (targetPlayerId: string) => {
    if (!room || !currentPlayerId) return;
    setHasAccused(true);
    const winner = checkAccusation(targetPlayerId, players);
    setAccusationWinner(winner);
    await supabase.from("room_events").insert({
      room_id: roomId, event_type: "final_accusation",
      payload_json: { accuser_id: currentPlayerId, target_id: targetPlayerId, winner },
    });
    if (winner === "innocent") {
      await supabase.from("room_players").update({ is_alive: false }).eq("id", targetPlayerId);
    }
    await advanceGameState(supabase, roomId, "game_result");
  };

  // Render
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  if (!room || !currentPlayerId || !currentPlayer || players.length === 0) {
    return (<div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">جاري التحميل...</p></div>);
  }

  const myCharacter = characters.find((c) => c.id === currentPlayer.assigned_character_id);
  const isHost = room.host_player_id === currentPlayerId;
  const partnerNames = players
    .filter((p) => p.assigned_role === "mafioso" && p.id !== currentPlayerId)
    .map((p) => p.nickname);

  const accumulatedEvidence: string[] = [];
  if (caseData) {
    for (let r = 1; r <= room.current_round; r++) {
      accumulatedEvidence.push(getEvidenceForRound(r, caseData));
    }
  }

  switch (room.current_state) {
    case "assigning_roles":
      return (
        <RoleReveal player={currentPlayer} character={myCharacter ?? null}
          partnerNames={currentPlayer?.assigned_role === "mafioso" ? partnerNames : []}
          allPlayers={players} allCharacters={characters} isHost={isHost}
          onContinue={() => handleAdvance("case_intro")} />
      );

    case "case_intro":
      return caseData ? (
        <CaseIntro caseData={caseData} isHost={isHost}
          onContinue={() => handleAdvance("round_evidence")} />
      ) : null;

    case "round_evidence":
      return caseData ? (
        <EvidenceReveal roundNumber={room.current_round}
          evidenceText={getEvidenceForRound(room.current_round, caseData)}
          isHost={isHost} onContinue={() => handleAdvance("round_discussion")}
          playerNickname={currentPlayer.nickname}
          characterName={myCharacter?.character_name ?? null}
          characterProfile={myCharacter?.public_profile ?? null}
          playerRole={currentPlayer.assigned_role} />
      ) : null;

    case "round_discussion":
      return (
        <DiscussionTimer roundNumber={room.current_round} isFinal={false}
          isHost={isHost} onTimeUp={() => handleAdvance("round_vote")}
          roomId={roomId} currentPlayerId={currentPlayerId}
          allPlayers={players} allCharacters={characters}
          accumulatedEvidence={accumulatedEvidence} />
      );

    case "round_vote": {
      const { isRevote, tiedPlayerIds } = revoteInfo;
      const alivePlayers = players.filter((p) => p.is_alive);
      const roundVotes = votes.filter(
        (v) => v.round_number === room.current_round && v.is_revote === isRevote
      );
      const playersWhoVoted = new Set(roundVotes.map((v) => v.voter_player_id));
      const waitingCount = alivePlayers.filter((p) => !playersWhoVoted.has(p.id)).length;

      const voteCandidates = isRevote && tiedPlayerIds.length > 0
        ? alivePlayers.filter((p) => tiedPlayerIds.includes(p.id))
        : alivePlayers;

      return (
        <VotingScreen alivePlayers={voteCandidates} currentPlayerId={currentPlayerId}
          roundNumber={room.current_round} isRevote={isRevote}
          onVote={handleVote} hasVoted={hasVoted || playersWhoVoted.has(currentPlayerId)}
          waitingCount={waitingCount} />
      );
    }

    case "round_reveal": {
      const firstVotes = votes.filter(
        (v) => v.round_number === room.current_round && !v.is_revote
      );
      const revoteVotes = votes.filter(
        (v) => v.round_number === room.current_round && v.is_revote
      );

      const relevantVotes = revoteVotes.length > 0 ? revoteVotes : firstVotes;
      const jailedId = revoteVotes.length > 0
        ? getJailedPlayerIdForceResolve(relevantVotes)
        : getJailedPlayerId(relevantVotes);

      const jailed = jailedId ? players.find((p) => p.id === jailedId) ?? null : null;
      const jailedIsMafioso = jailed?.assigned_role === "mafioso";

      const wasTie = !jailed;
      const firstVoteTied = firstVotes.length > 0 && !getJailedPlayerId(firstVotes);
      const isFirstTie = wasTie && firstVoteTied && revoteVotes.length === 0;
      const tiedIds = isFirstTie ? getTiedPlayerIds(firstVotes) : [];

      return (
        <JailReveal jailedPlayer={jailed} wasTie={wasTie} isHost={isHost}
          onContinue={isFirstTie ? handleRevote : () => handleAdvance()}
          continueLabel={isFirstTie ? "إعادة تصويت ⚖️" : undefined}
          extraMessage={
            isFirstTie
              ? `تعادل بين ${tiedIds.length} لاعبين — هيتم إعادة التصويت بينهم بس`
              : jailedIsMafioso && room.player_count_mode === 5
                ? (() => {
                    const rem = players.filter(
                      (p) => p.assigned_role === "mafioso" && p.is_alive && p.id !== jailedId
                    );
                    return rem.length > 0 ? "لسه في مافيوزو تاني!" : undefined;
                  })()
                : undefined
          } />
      );
    }

    case "final_accusation": {
      const lastJailed = getLastJailedInnocent(players);
      const alivePlayers = players.filter((p) => p.is_alive);
      if (!lastJailed) {
        return (<GameResult winner="mafioso" players={players}
          caseData={caseData!} currentPlayerId={currentPlayerId} />);
      }
      return (
        <FinalAccusation accuserPlayer={lastJailed} alivePlayers={alivePlayers}
          currentPlayerId={currentPlayerId} onAccuse={handleAccusation}
          hasAccused={hasAccused} />
      );
    }

    case "game_result":
      return caseData ? (
        <GameResult winner={accusationWinner ?? determineWinner(players)}
          players={players} caseData={caseData} currentPlayerId={currentPlayerId} />
      ) : null;

    default:
      return (<div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">جاري التحميل...</p></div>);
  }
}
