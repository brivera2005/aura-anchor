import fs from "fs";
import path from "path";

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".dev.vars"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key.includes("placeholder")) {
  console.log("Missing valid Supabase admin credentials");
  process.exit(1);
}

const relationshipId = process.argv[2] || "7d16deaa-7506-44f9-a8c9-ea63cfdd69b2";

async function runSql(sql) {
  const r = await fetch(`${url}/rest/v1/rpc`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  return r;
}

async function q(table, select, filter = "") {
  const r = await fetch(
    `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text, status: r.status };
  }
}

// Apply migration via PostgREST won't work for DDL - try direct pg or report manual step
const migrationSql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/009_partner_cycle_answers.sql"),
  "utf8"
);

console.log("=== Migration 009 (run in Supabase SQL Editor if column missing) ===");
console.log(migrationSql.slice(0, 200) + "...\n");

const rel = await q(
  "relationships",
  "id,cycle_number,questions_answered_this_cycle,partner_answers_this_cycle,themes_covered,user1_id,user2_id,status",
  `&id=eq.${relationshipId}`
);

console.log("=== Ben/Sarah relationship ===");
console.log(JSON.stringify(rel, null, 2));

if (Array.isArray(rel) && rel[0]) {
  const r = rel[0];
  const questions = await q(
    "ai_questions",
    "id,for_user_id,status,cycle_number,theme,created_at",
    `&relationship_id=eq.${relationshipId}&order=created_at.asc`
  );
  const pending = (questions || []).filter((q) => q.status === "pending");
  const answered = (questions || []).filter((q) => q.status === "answered");
  console.log("\n=== Questions summary ===");
  console.log({
    total: questions?.length,
    pending: pending.length,
    answered: answered.length,
    currentCycle: r.cycle_number,
    partnerAnswers: r.partner_answers_this_cycle,
  });

  const profiles = await q(
    "profiles",
    "user_id,name,email",
    `&user_id=in.(${r.user1_id},${r.user2_id})`
  );
  console.log("\n=== Profiles ===");
  console.log(JSON.stringify(profiles, null, 2));
}
