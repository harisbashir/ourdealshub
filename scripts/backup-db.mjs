import { recordOperation } from "./record-operation.mjs";
// Portable MariaDB backup. Node 22 loads .env; the DB password is never a shell argument.
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, chmod } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { resolve, join } from "node:path";

const url = new URL(process.env.DATABASE_URL || "");
if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://");
const dir = resolve(process.env.BACKUP_DIR || "backups");
await mkdir(dir, { recursive: true, mode: 0o700 });
await chmod(dir, 0o700);
const file = join(dir, `ourdealshub-${new Date().toISOString().replace(/[:.]/g, "-")}.sql.gz`);
const args = ["--single-transaction", "--quick", "--skip-lock-tables", "--hex-blob",
  "--default-character-set=utf8mb4", "--host", url.hostname,
  "--port", url.port || "3306", "--user", decodeURIComponent(url.username),
  decodeURIComponent(url.pathname.slice(1))];
const child = spawn(process.env.DB_DUMP_BIN || "mariadb-dump", args, {
  env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
  stdio: ["ignore", "pipe", "pipe"],
});
const status = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`Database dump exited ${code}`)));
});
// Surface tool errors, without printing the connection string or password.
child.stderr.on("data", (chunk) => process.stderr.write(chunk));
try {
  await Promise.all([status, pipeline(child.stdout, createGzip(), createWriteStream(file + ".tmp", { mode: 0o600 }))]);
  await rename(file + ".tmp", file);
  const keep = Math.max(1, parseInt(process.env.BACKUP_KEEP || "14", 10) || 14);
  const files = (await readdir(dir)).filter((f) => /^ourdealshub-.*\.sql\.gz$/.test(f)).sort().reverse();
  for (const old of files.slice(keep)) await rm(join(dir, old));
  console.log(`Backup written: ${file}`);
  await recordOperation("Database backup completed", "A private, compressed MariaDB backup was created successfully.");
} catch (error) {
  child.kill();
  await rm(file + ".tmp", { force: true });
  await recordOperation("Database backup failed", "Review backup job logs and available disk space.", "error");
  throw error;
}
