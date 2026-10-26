// Use Node 22 --env-file=/absolute/path/to/.env scripts/cron-daily.mjs.
// Runs outside HTTP so managed hosting's request timeout does not interrupt it.
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";
import { register as registerCommonJS } from "tsx/cjs/api";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
registerCommonJS();
register();
const { prisma } = await import("../src/lib/prisma.ts");
try {
  const { runSecurityBootChecks } = await import("../src/lib/security-boot.ts");
  runSecurityBootChecks();
  const { runDailyJob } = await import("../src/lib/daily-job.ts");
  console.log(JSON.stringify(await runDailyJob({ revalidate: false })));
} catch (error) {
  const { recordSystemEvent } = await import("../src/lib/system-events.ts");
  await recordSystemEvent({ category: "operations", level: "error", title: "Daily maintenance failed", detail: "Review the daily job logs.", adminPath: "/admin/settings#email" });
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
