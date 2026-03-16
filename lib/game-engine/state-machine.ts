import type { GameState } from "@/types/database";

/**
 * Defines valid state transitions for the game.
 * 3-player mode: 2 evidence rounds (round 3 may be skipped)
 * 5-player mode: 3 evidence rounds + final discussion
 */

const STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  waiting: ["ready_check"],
  ready_check: ["assigning_roles"],
  assigning_roles: ["case_intro"],
  case_intro: ["round_evidence"],
  round_evidence: ["round_discussion"],
  round_discussion: ["round_vote"],
  round_vote: ["round_reveal"],
  round_reveal: ["round_evidence", "final_discussion", "game_result"],
  final_discussion: ["final_vote"],
  final_vote: ["game_result"],
  game_result: [],
};

export function canTransition(from: GameState, to: GameState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextState(
  currentState: GameState,
  currentRound: number,
  playerCount: 3 | 5,
  allMafiosoCaught: boolean
): GameState {
  // If all mafioso caught, game is over
  if (allMafiosoCaught && currentState === "round_reveal") {
    return "game_result";
  }

  const maxRounds = playerCount === 3 ? 2 : 3;

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
      if (currentRound < maxRounds) {
        return "round_evidence";
      }
      if (playerCount === 5) {
        return "final_discussion";
      }
      return "game_result";
    case "final_discussion":
      return "final_vote";
    case "final_vote":
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
