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

const relationshipId =
  process.argv[2] || "7d16deaa-7506-44f9-a8c9-ea63cfdd69b2";
const appUrl =
  process.env.APP_URL ||
  env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";
const adminToken =
  process.env.ENCRYPTION_KEY || env.ENCRYPTION_KEY;

if (!adminToken) {
  console.error("Missing ENCRYPTION_KEY in env or .env.local");
  process.exit(1);
}

const res = await fetch(
  `${appUrl}/api/relationship/${relationshipId}/reset-healing-loop`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": adminToken,
    },
    body: JSON.stringify({ seedCycle1: true }),
  }
);

const data = await res.json().catch(() => ({}));
console.log(JSON.stringify(data, null, 2));
if (!res.ok) process.exit(1);
