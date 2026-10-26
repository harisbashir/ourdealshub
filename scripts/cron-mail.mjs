// Use Node 22 --env-file=/absolute/path/to/.env scripts/cron-mail.mjs.
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
  const { checkSystemHealth, processMailQueue } = await import("../src/lib/mail-worker.ts");
  await checkSystemHealth();
  console.log(JSON.stringify(await processMailQueue()));
  const cutoff = new Date(Date.now() - 90 * 86400_000);
  await prisma.systemEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await prisma.mailDelivery.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await prisma.mailOAuthAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
} catch (error) {
  const { recordSystemEvent } = await import("../src/lib/system-events.ts");
  await recordSystemEvent({ category: "operations", level: "error", title: "Mail monitoring failed", detail: "Review the mail worker logs.", adminPath: "/admin/settings#email" });
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
