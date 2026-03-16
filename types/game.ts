import type { CaseCharacter, GameState, Room, RoomPlayer } from "./database";

export interface GameContext {
  room: Room;
  players: RoomPlayer[];
  currentPlayerId: string;
  characters: CaseCharacter[];
}

export interface PlayerView {
  id: string;
  nickname: string;
  avatar: string;
  seat_number: number;
  is_alive: boolean;
  is_ready: boolean;
  // Only visible to the player themselves
  assigned_role?: "mafioso" | "innocent" | null;
  assigned_character?: CaseCharacter | null;
  // Only visible to fellow mafioso in 5-player mode
  is_partner?: boolean;
}

export interface RoundData {
  round_number: number;
  evidence_text: string;
  state: GameState;
}

export interface VoteResult {
  target_player_id: string;
  vote_count: number;
}

export interface GameStateTransition {
  from: GameState;
  to: GameState;
  condition?: () => boolean;
}

export const AVATAR_OPTIONS = [
  { id: "detective", emoji: "🕵️", label: "محقق" },
  { id: "suspect", emoji: "🤨", label: "مشتبه" },
  { id: "boss", emoji: "😎", label: "زعيم" },
  { id: "shadow", emoji: "🌑", label: "ظل" },
  { id: "mask", emoji: "🎭", label: "قناع" },
  { id: "eye", emoji: "👁️", label: "عين" },
  { id: "skull", emoji: "💀", label: "جمجمة" },
  { id: "fire", emoji: "🔥", label: "نار" },
  { id: "diamond", emoji: "💎", label: "ألماس" },
  { id: "knife", emoji: "🔪", label: "سكينة" },
  { id: "ghost", emoji: "👻", label: "شبح" },
  { id: "crown", emoji: "👑", label: "تاج" },
] as const;

export type AvatarId = (typeof AVATAR_OPTIONS)[number]["id"];

export const DISCUSSION_TIMER_SECONDS = 180;
export const VOTE_TIMER_SECONDS = 30;
