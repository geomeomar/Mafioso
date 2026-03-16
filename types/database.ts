export interface Case {
  id: string;
  case_code: string;
  crime_type: string;
  title: string;
  intro: string;
  player_count: 3 | 5;
  mafioso_count: number;
  mafioso_names: string;
  round_1_evidence: string;
  round_2_evidence: string;
  round_3_evidence: string;
  final_truth: string;
  innocent_secrets: string;
  status: "draft" | "reviewed" | "production_ready";
  language: string;
}

export interface CaseCharacter {
  id: string;
  case_id: string;
  character_name: string;
  character_order: number;
  public_profile: string;
  is_mafioso: boolean;
}

export interface Room {
  id: string;
  room_code: string;
  host_player_id: string;
  status: RoomStatus;
  case_id: string | null;
  player_count_mode: 3 | 5;
  current_round: number;
  current_state: GameState;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  nickname: string;
  avatar: string;
  seat_number: number;
  is_ready: boolean;
  is_alive: boolean;
  assigned_role: "mafioso" | "innocent" | null;
  assigned_character_id: string | null;
  joined_at: string;
}

export interface RoomVote {
  id: string;
  room_id: string;
  round_number: number;
  voter_player_id: string;
  target_player_id: string;
  is_revote: boolean;
  created_at: string;
}

export interface RoomEvent {
  id: string;
  room_id: string;
  event_type: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface GameResult {
  id: string;
  room_id: string;
  winner_side: "mafioso" | "innocent";
  summary: string;
  ended_at: string;
}

export type RoomStatus = "waiting" | "playing" | "finished" | "abandoned";

export type GameState =
  | "waiting"
  | "ready_check"
  | "assigning_roles"
  | "case_intro"
  | "round_evidence"
  | "round_discussion"
  | "round_vote"
  | "round_reveal"
  | "final_accusation"
  | "game_result";
