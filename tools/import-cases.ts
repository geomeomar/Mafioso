/**
 * Excel Case Data Import Script
 *
 * Usage: npx tsx tools/import-cases.ts
 *
 * Reads arabic_crime_game_database.xlsx and imports into Supabase.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Path to Excel file (one level up from mafioso/)
const EXCEL_PATH = path.resolve(__dirname, "../../arabic_crime_game_database.xlsx");

interface ExcelCase {
  case_id: string;
  crime_type: string;
  title: string;
  intro: string;
  player_count: number;
  mafioso_count: number;
  mafioso_names: string;
  round_1_misleading_evidence: string;
  round_2_misleading_evidence: string;
  round_3_misleading_evidence: string;
  final_truth: string;
  innocent_secrets: string;
}

interface ExcelCharacter {
  char_id: string;
  case_id: string;
  character_order: number;
  character_name: string;
  character_description: string;
  is_mafioso: number; // 1 or 0
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Excel file not found at: ${EXCEL_PATH}`);
    process.exit(1);
  }

  console.log("📖 Reading Excel file...");
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Parse Cases sheet
  const casesSheet = workbook.Sheets["Cases"] || workbook.Sheets[workbook.SheetNames[1]];
  if (!casesSheet) {
    console.error("❌ Cases sheet not found");
    process.exit(1);
  }

  const casesRaw: ExcelCase[] = XLSX.utils.sheet_to_json(casesSheet);
  console.log(`📋 Found ${casesRaw.length} cases`);

  // Parse Characters sheet
  const charsSheet = workbook.Sheets["Characters"] || workbook.Sheets[workbook.SheetNames[2]];
  if (!charsSheet) {
    console.error("❌ Characters sheet not found");
    process.exit(1);
  }

  const charsRaw: ExcelCharacter[] = XLSX.utils.sheet_to_json(charsSheet);
  console.log(`👥 Found ${charsRaw.length} characters`);

  // Import cases
  console.log("\n⬆️  Importing cases...");
  const caseIdMap = new Map<string, string>(); // Excel case_id → Supabase UUID

  for (const c of casesRaw) {
    const { data, error } = await supabase
      .from("cases")
      .insert({
        case_code: c.case_id,
        crime_type: c.crime_type,
        title: c.title,
        intro: c.intro,
        player_count: c.player_count,
        mafioso_count: c.mafioso_count,
        mafioso_names: c.mafioso_names,
        round_1_evidence: c.round_1_misleading_evidence,
        round_2_evidence: c.round_2_misleading_evidence,
        round_3_evidence: c.round_3_misleading_evidence || null,
        final_truth: c.final_truth,
        innocent_secrets: c.innocent_secrets || null,
        status: "production_ready",
        language: "ar-EG",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ❌ Failed to import case ${c.case_id}: ${error.message}`);
      continue;
    }

    caseIdMap.set(c.case_id, data.id);
    console.log(`  ✅ ${c.case_id} - ${c.title}`);
  }

  // Import characters
  console.log("\n⬆️  Importing characters...");
  let charCount = 0;

  for (const ch of charsRaw) {
    const supabaseCaseId = caseIdMap.get(ch.case_id);
    if (!supabaseCaseId) {
      console.error(`  ❌ Case ${ch.case_id} not found for character ${ch.char_id}`);
      continue;
    }

    const { error } = await supabase.from("case_characters").insert({
      case_id: supabaseCaseId,
      character_name: ch.character_name,
      character_order: ch.character_order,
      public_profile: ch.character_description,
      is_mafioso: ch.is_mafioso === 1,
    });

    if (error) {
      console.error(`  ❌ Failed to import character ${ch.char_id}: ${error.message}`);
      continue;
    }
    charCount++;
  }

  console.log(`\n✅ Import complete: ${caseIdMap.size} cases, ${charCount} characters`);

  // Validation
  console.log("\n🔍 Validating...");
  const { count: dbCases } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true });
  const { count: dbChars } = await supabase
    .from("case_characters")
    .select("*", { count: "exact", head: true });

  console.log(`  Cases in DB: ${dbCases}`);
  console.log(`  Characters in DB: ${dbChars}`);

  if (dbCases === casesRaw.length && dbChars === charsRaw.length) {
    console.log("  ✅ All data imported successfully!");
  } else {
    console.log("  ⚠️  Some records may have failed to import.");
  }
}

main().catch(console.error);
