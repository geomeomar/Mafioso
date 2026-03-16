/**
 * Opens 3 browser windows for testing the game.
 *
 * 1. Creates a room via Supabase
 * 2. Opens 3 browser tabs — one for host, two for joiners
 *
 * Run: npx tsx tools/open-3-browsers.ts
 */

import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually (works in PowerShell, cmd, bash)
const envPath = resolve(__dirname, "..", ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found, rely on existing env vars
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE_URL = process.env.BASE_URL || "https://mafioso-xi.vercel.app";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function openUrl(url: string) {
  // Windows — use explorer to open URLs reliably
  exec(`explorer "${url}"`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("\n🎮  MAFIOSO — Opening 3 Browser Windows\n");

  // Pick a random 3-player case
  const { data: cases } = await supabase
    .from("cases")
    .select("id, case_code, title")
    .eq("player_count", 3)
    .eq("status", "production_ready");

  if (!cases || cases.length === 0) {
    console.log("❌  No 3-player cases found!");
    return;
  }

  const caseData = cases[Math.floor(Math.random() * cases.length)];
  console.log(`📋  Case: ${caseData.case_code} — ${caseData.title}`);

  // Generate room code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomCode = "";
  for (let i = 0; i < 6; i++) {
    roomCode += chars[Math.floor(Math.random() * chars.length)];
  }

  // Create room
  const { data: room, error } = await supabase
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

  if (error || !room) {
    console.log(`❌  Failed to create room: ${error?.message}`);
    return;
  }

  console.log(`🏠  Room created: ${roomCode}`);
  console.log(`🔗  Room ID: ${room.id}\n`);

  // URLs
  const hostUrl = `${BASE_URL}/create`;
  const joinUrl = `${BASE_URL}/room/${roomCode}/join`;

  console.log("Opening 3 browser windows...\n");

  // Window 1: Host creates room (or joins directly)
  console.log(`🟢  Window 1 (Host):   ${hostUrl}`);
  console.log(`     → Create a room with 3 players\n`);
  openUrl(hostUrl);

  await sleep(1500);

  // Window 2: Player 2 joins
  console.log(`🔵  Window 2 (Join):   ${joinUrl}`);
  openUrl(joinUrl);

  await sleep(1500);

  // Window 3: Player 3 joins
  console.log(`🟣  Window 3 (Join):   ${joinUrl}`);
  openUrl(joinUrl);

  console.log("\n" + "=".repeat(50));
  console.log(`📌  Room Code: ${roomCode}`);
  console.log(`📌  Join Link: ${BASE_URL}/room/${roomCode}/join`);
  console.log("=".repeat(50));
  console.log("\n📝  Instructions:");
  console.log("   1. Window 1: Create a NEW room (3 players)");
  console.log("      OR use the pre-made room code above");
  console.log("   2. Window 2 & 3: Pick nickname + avatar → Join");
  console.log("   3. All mark ready → Host starts the game");
  console.log("   4. Play through all rounds!\n");
  console.log("   💡 Tip: Use different Chrome profiles or");
  console.log("      incognito windows if sessionStorage conflicts\n");
}

main().catch(console.error);
