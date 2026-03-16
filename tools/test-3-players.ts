/**
 * Test script: Simulates 3 players joining a room and playing through the game.
 * Uses Supabase directly — no browser needed.
 *
 * Run: npx tsx tools/test-3-players.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AVATARS = ["detective", "suspect", "boss"];
const NICKNAMES = ["عمر", "أحمد", "سارة"];

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getRoom(roomId: string) {
  const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  return data;
}

async function getPlayers(roomId: string) {
  const { data } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("seat_number");
  return data ?? [];
}

async function getVotes(roomId: string) {
  const { data } = await supabase.from("room_votes").select("*").eq("room_id", roomId);
  return data ?? [];
}

async function advanceState(roomId: string, state: string, round?: number) {
  const update: Record<string, unknown> = { current_state: state };
  if (round !== undefined) update.current_round = round;
  if (state === "game_result") {
    update.status = "finished";
    update.ended_at = new Date().toISOString();
  }
  await supabase.from("rooms").update(update).eq("id", roomId);
}

async function main() {
  console.log("\n" + "=".repeat(60));
  log("🎮", "MAFIOSO TEST — 3 Player Game Simulation");
  console.log("=".repeat(60) + "\n");

  // ─── Step 1: Create Room ───
  log("🏠", "Creating room...");

  const { data: cases } = await supabase
    .from("cases")
    .select("id, case_code, title, mafioso_names, player_count")
    .eq("player_count", 3)
    .eq("status", "production_ready")
    .limit(1);

  if (!cases || cases.length === 0) {
    log("❌", "No 3-player cases found! Run the migration first.");
    return;
  }

  const caseData = cases[0];
  log("📋", `Case: ${caseData.case_code} — ${caseData.title}`);
  log("🔪", `Mafioso: ${caseData.mafioso_names}`);

  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .insert({
      room_code: roomCode,
      status: "waiting",
      case_id: caseData.id,
      player_count_mode: 3,
      current_round: 1,
      current_state: "waiting",
    })
    .select()
    .single();

  if (roomErr || !room) {
    log("❌", `Failed to create room: ${roomErr?.message}`);
    return;
  }

  log("✅", `Room created: ${roomCode} (ID: ${room.id})`);

  // ─── Step 2: Add 3 Players ───
  log("👥", "Adding 3 players...");

  const playerIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const { data: player, error: playerErr } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        nickname: NICKNAMES[i],
        avatar: AVATARS[i],
        seat_number: i + 1,
        is_ready: true,
        is_alive: true,
      })
      .select()
      .single();

    if (playerErr || !player) {
      log("❌", `Failed to add player ${NICKNAMES[i]}: ${playerErr?.message}`);
      return;
    }
    playerIds.push(player.id);
    log("  👤", `${NICKNAMES[i]} joined (seat ${i + 1})`);
  }

  // Set host
  await supabase.from("rooms").update({ host_player_id: playerIds[0] }).eq("id", room.id);
  log("👑", `${NICKNAMES[0]} is host`);

  // ─── Step 3: Assign Roles ───
  log("🎭", "Assigning roles...");

  const { data: characters } = await supabase
    .from("case_characters")
    .select("*")
    .eq("case_id", caseData.id)
    .order("character_order");

  if (!characters || characters.length < 3) {
    log("❌", "Not enough characters!");
    return;
  }

  // Assign characters to players
  for (let i = 0; i < 3; i++) {
    const char = characters[i];
    await supabase
      .from("room_players")
      .update({
        assigned_role: char.is_mafioso ? "mafioso" : "innocent",
        assigned_character_id: char.id,
      })
      .eq("id", playerIds[i]);

    const role = char.is_mafioso ? "🔪 MAFIOSO" : "😇 INNOCENT";
    log("  🎭", `${NICKNAMES[i]} → ${char.character_name} (${role})`);
  }

  await advanceState(room.id, "assigning_roles");
  log("✅", "Roles assigned\n");

  // ─── Step 4: Case Intro ───
  await sleep(500);
  await advanceState(room.id, "case_intro");
  log("📖", "Case intro shown");

  // ─── Step 5: Round 1 Evidence ───
  await sleep(500);
  await advanceState(room.id, "round_evidence");
  log("🔍", "Round 1 evidence revealed");

  // ─── Step 6: Discussion ───
  await sleep(500);
  await advanceState(room.id, "round_discussion");
  log("💬", "Discussion started (3 min timer)");

  // ─── Step 7: Round 1 Vote ───
  await sleep(500);
  await advanceState(room.id, "round_vote");
  log("🗳️", "Round 1 voting...");

  const players = await getPlayers(room.id);
  const alivePlayers = players.filter((p) => p.is_alive);

  // ─── SCENARIO A: Clear majority ───
  console.log("\n" + "-".repeat(40));
  log("📌", "SCENARIO A: Clear majority (2-1)");
  console.log("-".repeat(40));

  // Player 0 and 1 vote for player 2, player 2 votes for player 0
  for (let i = 0; i < 3; i++) {
    const targetIdx = i < 2 ? 2 : 0; // first 2 vote for player 2
    await supabase.from("room_votes").insert({
      room_id: room.id,
      round_number: 1,
      voter_player_id: playerIds[i],
      target_player_id: playerIds[targetIdx],
      is_revote: false,
    });
    log("  🗳️", `${NICKNAMES[i]} voted for ${NICKNAMES[targetIdx]}`);
  }

  // Check vote result
  const votes = await getVotes(room.id);
  const r1Votes = votes.filter((v) => v.round_number === 1 && !v.is_revote);
  const voteCounts = new Map<string, number>();
  for (const v of r1Votes) {
    voteCounts.set(v.target_player_id, (voteCounts.get(v.target_player_id) ?? 0) + 1);
  }

  let maxVotes = 0;
  let jailedId = "";
  for (const [pid, count] of voteCounts) {
    if (count > maxVotes) {
      maxVotes = count;
      jailedId = pid;
    }
  }

  const jailedIdx = playerIds.indexOf(jailedId);
  const jailedPlayer = players.find((p) => p.id === jailedId);
  log("🔒", `${NICKNAMES[jailedIdx]} got ${maxVotes} votes → JAILED!`);

  // Jail the player
  await supabase.from("room_players").update({ is_alive: false }).eq("id", jailedId);
  await advanceState(room.id, "round_reveal");

  const role = jailedPlayer?.assigned_role;
  if (role === "mafioso") {
    log("🔪", `${NICKNAMES[jailedIdx]} was MAFIOSO!`);

    // Check if all mafioso caught
    const updatedPlayers = await getPlayers(room.id);
    const remainingMafioso = updatedPlayers.filter(
      (p) => p.assigned_role === "mafioso" && p.is_alive
    );

    if (remainingMafioso.length === 0) {
      log("🎉", "ALL MAFIOSO CAUGHT → INNOCENTS WIN!");
      await advanceState(room.id, "game_result");
    } else {
      log("⚠️", `Still ${remainingMafioso.length} mafioso alive → Continue to R2`);
      // Would continue to round 2...
    }
  } else {
    log("😇", `${NICKNAMES[jailedIdx]} was INNOCENT!`);
    log("➡️", "Continue to Round 2...");

    // ─── Round 2 ───
    await advanceState(room.id, "round_evidence", 2);
    log("🔍", "Round 2 evidence revealed");

    await sleep(300);
    await advanceState(room.id, "round_discussion");
    log("💬", "Round 2 discussion");

    await sleep(300);
    await advanceState(room.id, "round_vote");
    log("🗳️", "Round 2 voting (2 alive players)...");

    const alive2 = (await getPlayers(room.id)).filter((p) => p.is_alive);
    log("  👥", `Alive: ${alive2.map((p) => p.nickname).join(", ")}`);

    // Both vote for each other → TIE
    console.log("\n" + "-".repeat(40));
    log("📌", "SCENARIO B: Tie in R2 (1-1)");
    console.log("-".repeat(40));

    for (const p of alive2) {
      const target = alive2.find((t) => t.id !== p.id)!;
      await supabase.from("room_votes").insert({
        room_id: room.id,
        round_number: 2,
        voter_player_id: p.id,
        target_player_id: target.id,
        is_revote: false,
      });
      log("  🗳️", `${p.nickname} voted for ${target.nickname}`);
    }

    log("⚖️", "TIE! 1-1 → Show tie screen");
    await advanceState(room.id, "round_reveal");

    // ─── Revote ───
    console.log("\n" + "-".repeat(40));
    log("📌", "SCENARIO C: Revote after tie");
    console.log("-".repeat(40));

    await advanceState(room.id, "round_vote");
    log("🔄", "Revote between tied players...");

    // This time, both vote for the same person
    const targetForRevote = alive2[0]; // both vote for first alive
    for (const p of alive2) {
      await supabase.from("room_votes").insert({
        room_id: room.id,
        round_number: 2,
        voter_player_id: p.id,
        target_player_id: targetForRevote.id,
        is_revote: true,
      });
      log("  🗳️", `${p.nickname} voted for ${targetForRevote.nickname}`);
    }

    log("🔒", `${targetForRevote.nickname} got 2 votes → JAILED!`);
    await supabase.from("room_players").update({ is_alive: false }).eq("id", targetForRevote.id);
    await advanceState(room.id, "round_reveal");

    const jailed2Role = targetForRevote.assigned_role;
    if (jailed2Role === "mafioso") {
      log("🔪", `${targetForRevote.nickname} was MAFIOSO!`);

      const final = await getPlayers(room.id);
      const mafLeft = final.filter((p) => p.assigned_role === "mafioso" && p.is_alive);
      if (mafLeft.length === 0) {
        log("🎉", "ALL MAFIOSO CAUGHT → INNOCENTS WIN!");
        await advanceState(room.id, "game_result");
      }
    } else {
      log("😇", `${targetForRevote.nickname} was INNOCENT!`);
      log("⚡", "Mafioso survived all rounds → FINAL ACCUSATION!");

      // ─── Final Accusation ───
      console.log("\n" + "-".repeat(40));
      log("📌", "SCENARIO D: Final Accusation");
      console.log("-".repeat(40));

      await advanceState(room.id, "final_accusation");

      // The last jailed innocent picks
      const lastJailedInnocent = targetForRevote;
      const aliveNow = (await getPlayers(room.id)).filter((p) => p.is_alive);

      log("🎯", `${lastJailedInnocent.nickname} (last jailed innocent) must pick the mafioso`);
      log("  👥", `Choices: ${aliveNow.map((p) => `${p.nickname} (${p.assigned_role})`).join(", ")}`);

      // Find the actual mafioso among alive
      const actualMafioso = aliveNow.find((p) => p.assigned_role === "mafioso");
      const actualInnocent = aliveNow.find((p) => p.assigned_role === "innocent");

      if (actualMafioso) {
        // Correct pick
        log("✅", `${lastJailedInnocent.nickname} picks ${actualMafioso.nickname} → CORRECT!`);
        log("🎉", "INNOCENTS WIN!");
      }

      if (actualInnocent) {
        // Wrong pick scenario
        log("❌", `(If picked ${actualInnocent.nickname} instead → WRONG → MAFIOSO WINS 🔪)`);
      }

      await advanceState(room.id, "game_result");
    }
  }

  // ─── Summary ───
  console.log("\n" + "=".repeat(60));
  log("📊", "GAME COMPLETE — Final State:");
  console.log("=".repeat(60));

  const finalPlayers = await getPlayers(room.id);
  for (const p of finalPlayers) {
    const char = characters.find((c) => c.id === p.assigned_character_id);
    const status = p.is_alive ? "🟢 alive" : "🔴 jailed";
    const roleEmoji = p.assigned_role === "mafioso" ? "🔪" : "😇";
    log("  ", `${p.nickname} → ${char?.character_name ?? "?"} ${roleEmoji} ${p.assigned_role} ${status}`);
  }

  const finalRoom = await getRoom(room.id);
  log("🏁", `Room status: ${finalRoom?.status}`);
  log("🏁", `Final state: ${finalRoom?.current_state}`);
  log("🏁", `Room code: ${roomCode}`);

  // Cleanup
  console.log("\n" + "-".repeat(40));
  log("🧹", "Cleaning up test data...");
  await supabase.from("room_votes").delete().eq("room_id", room.id);
  await supabase.from("room_events").delete().eq("room_id", room.id);
  await supabase.from("game_results").delete().eq("room_id", room.id);
  await supabase.from("rooms").update({ host_player_id: null }).eq("id", room.id);
  await supabase.from("room_players").delete().eq("room_id", room.id);
  await supabase.from("rooms").delete().eq("id", room.id);
  log("✅", "Test data cleaned up\n");
}

main().catch(console.error);
