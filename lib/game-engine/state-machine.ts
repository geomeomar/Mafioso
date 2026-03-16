import type { GameState } from "@/types/database";

/**
 * Game flow:
 * waiting → ready_check → assigning_roles → case_intro → round_evidence
 * → round_discussion → round_vote → round_reveal
 *   → if mafioso caught & allMafiosoCaught → game_result
 *   → if more rounds left → round_evidence (next round)
 *   → if last round & mafioso survived → final_accusation
 * final_accusation → game_result
 *
 * 4-player: 2 evidence rounds, 1 mafioso, 3 innocent
 * 5-player: 3 evidence rounds, 2 mafioso, 3 innocent
 *
 * Ties: randomly resolved (no revote). Always someone gets jailed.
 */

export function getNextState(
  currentState: GameState,
  currentRound: number,
  playerCount: 4 | 5,
  allMafiosoCaught: boolean
): GameState {
  const maxRounds = playerCount === 4 ? 2 : 3;

  switch (currentState) {
    case "waiting":
      return "ready_check";
    case "ready_check":
      return "assigning_roles";
    case "assigning_roles":
      return "case_intro";
    case "case_intro":
      return "round_evidence";
    case "round_evidence":
      return "round_discussion";
    case "round_discussion":
      return "round_vote";
    case "round_vote":
      return "round_reveal";
    case "round_reveal":
      // If all mafioso are caught → innocents win immediately
      if (allMafiosoCaught) {
        return "game_result";
      }
      // If more rounds left → continue with next evidence
      if (currentRound < maxRounds) {
        return "round_evidence";
      }
      // Last round done, mafioso survived → final accusation
      return "final_accusation";
    case "final_accusation":
      return "game_result";
    default:
      return "game_result";
  }
}

export function getEvidenceForRound(
  round: number,
  caseData: { round_1_evidence: string; round_2_evidence: string; round_3_evidence: string | null }
): string {
  switch (round) {
    case 1:
      return caseData.round_1_evidence;
    case 2:
      return caseData.round_2_evidence;
    case 3:
      return caseData.round_3_evidence ?? "";
    default:
      return "";
  }
}
