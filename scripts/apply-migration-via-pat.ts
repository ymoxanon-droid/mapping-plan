// scripts/apply-migration-via-pat.ts
// Apply migration file via Supabase Management API (lewat HTTPS:443).
// Bypass RDP outbound TCP block. Adapted from supabase-migration-full project.
//
// Usage:
//   npx tsx scripts/apply-migration-via-pat.ts supabase/migrations/005_presentations.sql
//
// Butuh:
//   - SUPABASE_ACCESS_TOKEN (PAT) di .env.local
//   - VITE_SUPABASE_URL di .env.local (untuk ekstrak project ref)
//   - HTTPS_PROXY env var kalau di belakang firewall
import "dotenv/config";
import { readFileSync } from "fs";
import { basename } from "path";

// Manual load .env.local (Vite convention)
const fs = await import("fs");
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  envContent.split("\n").forEach((line) => {
    const eq = line.indexOf("=");
    if (eq > 0 && !line.trim().startsWith("#")) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const URL = process.env.VITE_SUPABASE_URL || "";
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "";

if (!PAT) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  console.error("Add SUPABASE_ACCESS_TOKEN=sbp_xxx from https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}
if (!URL) {
  console.error("Missing VITE_SUPABASE_URL in .env.local");
  process.exit(1);
}

const refMatch = URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
const PROJECT_REF = refMatch?.[1];
if (!PROJECT_REF) {
  console.error("Cannot parse project ref:", URL);
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: tsx scripts/apply-migration-via-pat.ts <path-to-migration.sql>");
  process.exit(1);
}

const sql = readFileSync(filePath, "utf-8");
const fileName = basename(filePath);

console.log(`Project ref: ${PROJECT_REF}`);
console.log(`File:        ${filePath}`);
console.log(`Size:        ${sql.length} chars`);
console.log(`Proxy:       ${PROXY || "(none — direct HTTPS)"}`);
console.log("");

let fetchFn: typeof fetch = globalThis.fetch;
if (PROXY) {
  try {
    const undici = await import("undici");
    const dispatcher = new undici.ProxyAgent(PROXY);
    fetchFn = ((url: any, init: any) =>
      (undici as any).fetch(url, { ...init, dispatcher })) as any;
    console.log("[proxy] using undici.fetch via ProxyAgent");
  } catch {
    console.warn("[proxy] HTTPS_PROXY set tapi undici belum installed → fallback direct");
  }
}
console.log("");

async function runQuery(label: string, query: string): Promise<void> {
  const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  console.log(`[${label}] POST ${endpoint}`);
  console.log(`[${label}] query: ${query.length} chars`);
  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const txt = await res.text();
  if (!res.ok) {
    console.error(`[${label}] HTTP ${res.status}: ${txt}`);
    process.exit(1);
  }
  try {
    const json = JSON.parse(txt);
    console.log(`[${label}] OK — response:`, JSON.stringify(json).slice(0, 300));
  } catch {
    console.log(`[${label}] OK (non-JSON): ${txt.slice(0, 300)}`);
  }
}

await runQuery("migration", sql);
console.log("");
console.log("✅ Migration applied successfully");
