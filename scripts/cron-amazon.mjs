// Finite hourly refresh: no resident worker needed on managed hosting.
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";
import { register as registerCommonJS } from "tsx/cjs/api";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
registerCommonJS(); register();
const { prisma } = await import("../src/lib/prisma.ts");
try {
  const { runSecurityBootChecks } = await import("../src/lib/security-boot.ts");
  runSecurityBootChecks();
  const { syncAmazonProducts } = await import("../src/lib/amazon-sync.ts");
  const result = await syncAmazonProducts(150, { revalidate: false });
  console.log(JSON.stringify(result));
  if (result.errors) {
    const { recordSystemEvent } = await import("../src/lib/system-events.ts");
    await recordSystemEvent({ category: "operations", level: "warning", title: "Amazon offer refresh needs attention", detail: `${result.errors} products could not be refreshed. Expired savings are hidden automatically.`, dedupeKey: `offer-refresh:${new Date().toISOString().slice(0, 13)}`, adminPath: "/admin/settings#api-keys" });
  }
} catch {
  const { recordSystemEvent } = await import("../src/lib/system-events.ts");
  await recordSystemEvent({ category: "operations", level: "error", title: "Amazon offer refresh failed", detail: "Review the scheduled job and API connections.", adminPath: "/admin/settings#api-keys" });
  console.error("Amazon offer refresh failed. Review API credentials and database access.");
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
