/**
 * Apply partner slot migration (014) via Supabase SQL.
 * Requires SUPABASE_ACCESS_TOKEN + linked project, OR run SQL manually.
 *
 * Manual: Supabase Dashboard → SQL Editor → paste supabase/migrations/014_partner_slot.sql
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = path.join(import.meta.dirname, "..");
const migrationPath = path.join(root, "supabase/migrations/014_partner_slot.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

console.log("Partner slot migration (014)\n");
console.log("--- SQL (also in supabase/migrations/014_partner_slot.sql) ---\n");
console.log(sql);
console.log("\n--- End SQL ---\n");

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || "your-project-ref";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.log(
    "SUPABASE_ACCESS_TOKEN not set — run the SQL above in Supabase SQL Editor:"
  );
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  process.exit(0);
}

const result = spawnSync(
  "npx",
  ["supabase", "db", "push", "--project-ref", projectRef],
  {
    cwd: root,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    stdio: "inherit",
    shell: true,
  }
);

process.exit(result.status ?? 1);
