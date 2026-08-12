import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("Missing env");
  process.exit(1);
}

async function q(table, select = "*", filter = "") {
  const r = await fetch(
    `${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}&order=created_at.desc&limit=50`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  return r.json();
}

const rels = await q("relationships", "id,user1_id,user2_id,status,type,created_at");
const profiles = await q("profiles", "user_id,name,email,onboarding_completed");
const onboarding = await q(
  "onboarding_responses",
  "id,user_id,relationship_id,question_key,created_at"
);
const insights = await q(
  "relationship_insights",
  "id,relationship_id,insight_type,content,created_at"
);

console.log("=== RELATIONSHIPS ===");
console.log(JSON.stringify(rels, null, 2));
console.log("=== PROFILES ===");
console.log(JSON.stringify(profiles, null, 2));

if (Array.isArray(onboarding)) {
  const byRel = {};
  const byUser = {};
  for (const o of onboarding) {
    const rk = o.relationship_id || "NULL";
    byRel[rk] = (byRel[rk] || 0) + 1;
    byUser[o.user_id] = (byUser[o.user_id] || 0) + 1;
  }
  console.log("=== ONBOARDING total", onboarding.length, "===");
  console.log("by relationship_id:", byRel);
  console.log("by user_id:", byUser);
  console.log("sample:", JSON.stringify(onboarding.slice(0, 8), null, 2));
} else {
  console.log("ONBOARDING ERROR", onboarding);
}

console.log("=== INSIGHTS ===");
console.log(JSON.stringify(insights, null, 2));
