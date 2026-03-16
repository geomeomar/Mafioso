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

/**
 * Checks the final accusation: did the jailed innocent correctly identify a mafioso?
 */
export function checkAccusation(
  accusedPlayerId: string,
  players: RoomPlayer[]
): "innocent" | "mafioso" {
  const accused = players.find((p) => p.id === accusedPlayerId);
  if (accused?.assigned_role === "mafioso") {
    return "innocent"; // Correct guess — innocents win
  }
  return "mafioso"; // Wrong guess — mafioso wins
}

/**
 * Finds the last player who was jailed (most recently set is_alive = false).
 * Used to determine who gets the final accusation pick.
 */
export function getLastJailedInnocent(players: RoomPlayer[]): RoomPlayer | null {
  const jailedInnocents = players.filter(
    (p) => !p.is_alive && p.assigned_role === "innocent"
  );
  // Return the last one (highest seat number among jailed, or we track by order)
  return jailedInnocents.length > 0 ? jailedInnocents[jailedInnocents.length - 1] : null;
}
