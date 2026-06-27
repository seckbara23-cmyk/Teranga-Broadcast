#!/usr/bin/env node
// ============================================================================
// Teranga Broadcast — database verification runner
//
// Executes supabase/tests/verify_rls.sql against a Postgres database using the
// `pg` driver. The SQL is fully self-asserting and wraps its work in a
// transaction that is ROLLED BACK, so this is non-destructive — but it DOES
// connect and briefly write test rows, so it is for LOCAL / DEV / STAGING only.
//
// This is a developer tooling script. It is NOT production application code and
// contains no UI / replay / OBS logic.
//
// Usage:
//   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
//     pnpm db:verify
// ============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = resolve(here, "..", "supabase", "tests", "verify_rls.sql");

const C = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function die(message) {
  console.error(`${C.red}${C.bold}✖ ${message}${C.reset}`);
  process.exit(1);
}

// --- 1. Require DATABASE_URL (refuse to run without it) ---------------------
const url = process.env.DATABASE_URL;
if (!url || url.trim() === "") {
  die(
    "DATABASE_URL is not set — refusing to run.\n" +
      "  Point it at a LOCAL/DEV database, e.g. the Supabase local stack:\n" +
      '    DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm db:verify\n' +
      "  (Get the local URL from: supabase status)",
  );
}

// --- 2. Parse + safety guard against pointing at production -----------------
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  die(`DATABASE_URL is not a valid connection URL.`);
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const isLocal = LOCAL_HOSTS.has(host);
const allowRemote = process.env.TERANGA_DB_VERIFY_ALLOW_REMOTE === "1";

console.log(`${C.yellow}${C.bold}⚠  Teranga database verification${C.reset}`);
console.log(
  `${C.yellow}   This runs RLS tests inside a ROLLED-BACK transaction (non-destructive),\n` +
    `   but it connects and briefly writes test rows.\n` +
    `   Run ONLY against local / dev / staging — NEVER a production database.${C.reset}`,
);
console.log(`${C.dim}   target host: ${host || "(unknown)"}${C.reset}\n`);

if (!isLocal && !allowRemote) {
  die(
    `Host "${host}" does not look local — refusing as a safety measure.\n` +
      "  If this really is an intentional dev/staging target, opt in explicitly:\n" +
      "    TERANGA_DB_VERIFY_ALLOW_REMOTE=1 pnpm db:verify",
  );
}

// --- 3. Load the SQL + the pg driver ----------------------------------------
let sql;
try {
  sql = readFileSync(SQL_PATH, "utf8");
} catch {
  die(`Could not read ${SQL_PATH}`);
}

let pg;
try {
  pg = (await import("pg")).default;
} catch {
  die("The 'pg' package is not installed. Run: pnpm install");
}

// --- 4. Run, streaming PASS/FAIL notices ------------------------------------
const client = new pg.Client({ connectionString: url });

client.on("notice", (n) => {
  const m = (n && n.message) || "";
  if (m.startsWith("PASS")) console.log(`${C.green}✔ ${m}${C.reset}`);
  else if (m.startsWith("FAIL")) console.log(`${C.red}✖ ${m}${C.reset}`);
  else if (m.includes("ALL CHECKS PASSED")) {
    /* final summary printed below */
  } else console.log(`${C.dim}  ${m}${C.reset}`);
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`\n${C.green}${C.bold}✔ ALL CHECKS PASSED${C.reset}`);
  await client.end();
  process.exit(0);
} catch (err) {
  console.error(`\n${C.red}${C.bold}✖ VERIFICATION FAILED${C.reset}`);
  console.error(`${C.red}${(err && err.message) || err}${C.reset}`);
  try {
    await client.query("rollback");
  } catch {
    /* transaction already aborted/closed */
  }
  await client.end().catch(() => {});
  process.exit(1);
}
