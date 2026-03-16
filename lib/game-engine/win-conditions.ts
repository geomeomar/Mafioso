import type { RoomPlayer } from "@/types/database";

/**
 * Checks if all Mafioso have been jailed (Innocents win).
 */
export function allMafiosoCaught(players: RoomPlayer[]): boolean {
  return players
    .filter((p) => p.assigned_role === "mafioso")
    .every((p) => !p.is_alive);
}

/**
 * Checks if at least one Mafioso is still alive (Mafioso win at end of game).
 */
export function mafiosoSurvived(players: RoomPlayer[]): boolean {
  return players.some((p) => p.assigned_role === "mafioso" && p.is_alive);
}

/**
 * Determines the winner at game end.
 */
export function determineWinner(
  players: RoomPlayer[]
): "innocent" | "mafioso" {
  if (allMafiosoCaught(players)) {
    return "innocent";
  }
  return "mafioso";
}
