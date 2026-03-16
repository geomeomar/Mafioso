import type { CaseCharacter, RoomPlayer } from "@/types/database";

interface RoleAssignment {
  playerId: string;
  characterId: string;
  role: "mafioso" | "innocent";
}

/**
 * Assigns characters and hidden roles to players.
 * Characters keep their original mafioso designation from the case data.
 * Players are randomly mapped to characters.
 */
export function assignRoles(
  players: RoomPlayer[],
  characters: CaseCharacter[]
): RoleAssignment[] {
  if (players.length !== characters.length) {
    throw new Error(
      `Player count (${players.length}) doesn't match character count (${characters.length})`
    );
  }

  // Shuffle characters randomly
  const shuffled = [...characters].sort(() => Math.random() - 0.5);

  return players.map((player, i) => ({
    playerId: player.id,
    characterId: shuffled[i].id,
    role: shuffled[i].is_mafioso ? "mafioso" : "innocent",
  }));
}

/**
 * Returns the IDs of players who are mafioso (for partner visibility in 5-player mode).
 */
export function getMafiosoPartnerIds(
  players: RoomPlayer[]
): string[] {
  return players
    .filter((p) => p.assigned_role === "mafioso")
    .map((p) => p.id);
}

/**
 * Checks if a player is mafioso.
 */
export function isMafioso(player: RoomPlayer): boolean {
  return player.assigned_role === "mafioso";
}
