// Node 22 --env-file=/private/path/.env scripts/seed-demo-products.mjs
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";
import { register as registerCommonJS } from "tsx/cjs/api";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
registerCommonJS(); register();
const { prisma } = await import("../src/lib/prisma.ts");
try {
  const admin = await prisma.adminUser.findFirst({ where: { role: "SUPER_ADMIN", isActive: true } });
  if (!admin) throw new Error("Seed an admin first.");
  const { addDemoCatalog } = await import("../src/lib/demo-catalog.ts");
  console.log(`${await addDemoCatalog(admin.id)} sample listings added.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
