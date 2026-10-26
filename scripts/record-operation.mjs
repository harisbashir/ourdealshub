// Small bridge for deployment and backup scripts. Never pass secrets as details.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";
import { register as registerCommonJS } from "tsx/cjs/api";
let modules;
async function load() {
  if (modules) return modules;
  process.chdir(fileURLToPath(new URL("..", import.meta.url)));
  registerCommonJS(); register();
  modules = { ...(await import("../src/lib/prisma.ts")), ...(await import("../src/lib/system-events.ts")) };
  return modules;
}
export async function recordOperation(title, detail, level = "info") {
  try {
    const { recordSystemEvent, prisma } = await load();
    try { await recordSystemEvent({ category: "operations", title, detail, level, adminPath: "/admin/settings#email" }); }
    finally { await prisma.$disconnect(); }
  } catch { console.warn("[notifications] Operation could not be recorded."); }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [title, detail, level] = process.argv.slice(2);
  await recordOperation(title || "Deployment updated", detail || "A system operation completed.", level || "info");
}
