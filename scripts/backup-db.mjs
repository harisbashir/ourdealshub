/**
 * Postgres backup via pg_dump (Docker or local).
 * Usage: npm run db:backup
 * Requires: DATABASE_URL in .env, and pg_dump on PATH (or docker).
 * Keeps the newest KEEP_BACKUPS files (default 14).
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

const KEEP_BACKUPS = Math.max(
  1,
  Number.parseInt(process.env.BACKUP_KEEP || "14", 10) || 14
);

function loadDatabaseUrl() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    throw new Error(".env not found");
  }
  const raw = readFileSync(envPath, "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing in .env");
  return line
    .replace(/^DATABASE_URL=/, "")
    .trim()
    .replace(/^"|"$/g, "");
}

function pruneOldBackups(dir) {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("ourdealshub-") && f.endsWith(".sql"))
    .map((f) => {
      const path = join(dir, f);
      return { path, mtime: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const old of files.slice(KEEP_BACKUPS)) {
    unlinkSync(old.path);
    console.log("Pruned old backup:", old.path);
  }
}

const url = loadDatabaseUrl();
const outDir = join(process.cwd(), "backups");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = join(outDir, `ourdealshub-${stamp}.sql`);

console.log("Backing up to", outFile);

try {
  execSync(`pg_dump "${url}" -f "${outFile}" --no-owner --no-acl`, {
    stdio: "inherit",
    env: process.env,
  });
  console.log("Backup OK:", outFile);
} catch {
  console.log("pg_dump failed — trying docker postgres container…");
  try {
    execSync(
      `docker exec -i ourdealshub-db pg_dump -U ourdealshub ourdealshub > "${outFile}"`,
      { stdio: "inherit", shell: true }
    );
    console.log("Backup OK (docker):", outFile);
  } catch {
    console.error(
      "Backup failed. Install PostgreSQL client tools or start docker compose."
    );
    process.exit(1);
  }
}

pruneOldBackups(outDir);
console.log(`Retention: keeping newest ${KEEP_BACKUPS} backups.`);
