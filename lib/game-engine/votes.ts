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
 * Returns null if there's a tie at the top.
 */
export function getJailedPlayerId(votes: RoomVote[]): string | null {
  const results = tallyVotes(votes);
  if (results.length === 0) return null;

  // Check for tie at the top
  if (results.length > 1 && results[0].vote_count === results[1].vote_count) {
    return null; // Tie → needs revote
  }

  return results[0].target_player_id;
}

/**
 * Like getJailedPlayerId but on tie, randomly picks one. Used after revote.
 */
export function getJailedPlayerIdForceResolve(votes: RoomVote[]): string | null {
  const results = tallyVotes(votes);
  if (results.length === 0) return null;

  // If tie, random pick
  if (results.length > 1 && results[0].vote_count === results[1].vote_count) {
    const topVotes = results[0].vote_count;
    const tied = results.filter((r) => r.vote_count === topVotes);
    return tied[Math.floor(Math.random() * tied.length)].target_player_id;
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
  if (results[1].vote_count !== topVotes) return [];
  return results
    .filter((r) => r.vote_count === topVotes)
    .map((r) => r.target_player_id);
}
