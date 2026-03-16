import type { SupabaseClient } from "@supabase/supabase-js";
import type { Room, RoomPlayer, CaseCharacter } from "@/types/database";
import { assignRoles } from "@/lib/game-engine";

/**
 * Generates a random 6-character room code (uppercase letters + digits).
 */
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Creates a new room with a randomly selected case.
 */
export async function createRoom(
  supabase: SupabaseClient,
  playerCountMode: 4 | 5
): Promise<{ room: Room; roomCode: string } | { error: string }> {
  // Pick a random case matching player count
  const { data: cases, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("player_count", playerCountMode)
    .eq("status", "production_ready");

  if (caseError || !cases?.length) {
    return { error: "مفيش قضايا متاحة دلوقتي" };
  }

  const randomCase = cases[Math.floor(Math.random() * cases.length)];

  // Generate unique room code
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", roomCode)
      .eq("status", "waiting")
      .single();

    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      room_code: roomCode,
      status: "waiting",
      case_id: randomCase.id,
      player_count_mode: playerCountMode,
      current_round: 0,
      current_state: "waiting",
    })
    .select()
    .single();

  if (roomError || !room) {
    return { error: "مقدرناش ننشئ الأوضة" };
  }

  return { room: room as Room, roomCode };
}

/**
 * Joins a player to a room.
 */
export async function joinRoom(
  supabase: SupabaseClient,
  roomCode: string,
  nickname: string,
  avatar: string
): Promise<{ player: RoomPlayer; room: Room } | { error: string }> {
  // Find room
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("room_code", roomCode.toUpperCase())
    .eq("status", "waiting")
    .single();

  if (roomError || !room) {
    return { error: "الأوضة مش موجودة أو اللعبة بدأت خلاص" };
  }

  // Count current players
  const { count } = await supabase
    .from("room_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id);

  const currentCount = count ?? 0;
  if (currentCount >= room.player_count_mode) {
    return { error: "الأوضة مليانة" };
  }

  // Add player
  const seatNumber = currentCount + 1;
  const { data: player, error: playerError } = await supabase
    .from("room_players")
    .insert({
      room_id: room.id,
      nickname,
      avatar,
      seat_number: seatNumber,
      is_ready: false,
      is_alive: true,
    })
    .select()
    .single();

  if (playerError || !player) {
    return { error: "مقدرناش نضيفك للأوضة" };
  }

  // If first player, set as host
  if (seatNumber === 1) {
    await supabase
      .from("rooms")
      .update({ host_player_id: player.id })
      .eq("id", room.id);
  }

  return { player: player as RoomPlayer, room: room as Room };
}

/**
 * Starts the game: assigns roles and advances state.
 */
export async function startGame(
  supabase: SupabaseClient,
  roomId: string
): Promise<{ success: boolean } | { error: string }> {
  // Get room and players
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "الأوضة مش موجودة" };

  const { data: players } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("seat_number");

  if (!players || players.length !== room.player_count_mode) {
    return { error: "عدد اللاعبين مش كافي" };
  }

  // Check all ready
  if (!players.every((p: RoomPlayer) => p.is_ready)) {
    return { error: "مش كل اللاعبين جاهزين" };
  }

  // Get case characters
  const { data: characters } = await supabase
    .from("case_characters")
    .select("*")
    .eq("case_id", room.case_id)
    .order("character_order");

  if (!characters || characters.length !== room.player_count_mode) {
    return { error: "القضية فيها مشكلة" };
  }

  // Assign roles
  const assignments = assignRoles(
    players as RoomPlayer[],
    characters as CaseCharacter[]
  );

  // Update each player with their role and character
  for (const assignment of assignments) {
    await supabase
      .from("room_players")
      .update({
        assigned_role: assignment.role,
        assigned_character_id: assignment.characterId,
      })
      .eq("id", assignment.playerId);
  }

  // Advance room state
  await supabase
    .from("rooms")
    .update({
      status: "playing",
      current_state: "assigning_roles",
      current_round: 1,
      started_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  return { success: true };
}

/**
 * Advances the room to the next game state.
 */
export async function advanceGameState(
  supabase: SupabaseClient,
  roomId: string,
  nextState: string,
  nextRound?: number
): Promise<void> {
  const update: Record<string, unknown> = { current_state: nextState };
  if (nextRound !== undefined) {
    update.current_round = nextRound;
  }
  if (nextState === "game_result") {
    update.status = "finished";
    update.ended_at = new Date().toISOString();
  }

  await supabase.from("rooms").update(update).eq("id", roomId);
}
