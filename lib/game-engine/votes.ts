import type { RoomVote } from "@/types/database";
import type { VoteResult } from "@/types/game";

/**
 * Tallies votes and returns sorted results (highest votes first).
 */
export function tallyVotes(votes: RoomVote[]): VoteResult[] {
  const counts = new Map<string, number>();

  for (const vote of votes) {
    counts.set(
      vote.target_player_id,
      (counts.get(vote.target_player_id) ?? 0) + 1
    );
  }

  return Array.from(counts.entries())
    .map(([target_player_id, vote_count]) => ({ target_player_id, vote_count }))
    .sort((a, b) => b.vote_count - a.vote_count);
}

/**
 * Determines who gets jailed this round.
 * Returns null if there's a tie (needs re-vote or skip).
 */
export function getJailedPlayerId(votes: RoomVote[]): string | null {
  const results = tallyVotes(votes);
  if (results.length === 0) return null;

  // Check for tie at the top
  if (results.length > 1 && results[0].vote_count === results[1].vote_count) {
    return null; // Tie — needs re-vote
  }

  return results[0].target_player_id;
}

/**
 * Returns the IDs of players who are tied at the top of the vote.
 */
export function getTiedPlayerIds(votes: RoomVote[]): string[] {
  const results = tallyVotes(votes);
  if (results.length < 2) return [];

  const topVotes = results[0].vote_count;
  return results
    .filter((r) => r.vote_count === topVotes)
    .map((r) => r.target_player_id);
}

/**
 * Checks if all alive players have voted for a given round.
 */
export function allPlayersVoted(
  votes: RoomVote[],
  alivePlayers: { id: string }[],
  roundNumber: number,
  isRevote: boolean
): boolean {
  const roundVotes = votes.filter(
    (v) => v.round_number === roundNumber && v.is_revote === isRevote
  );
  const voterIds = new Set(roundVotes.map((v) => v.voter_player_id));
  return alivePlayers.every((p) => voterIds.has(p.id));
}
