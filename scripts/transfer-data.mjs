// One-time, loss-checked PostgreSQL -> MariaDB transfer. Export uses the old
// generated PostgreSQL client; import/verify use the new MySQL client.
// Backups contain secrets. Keep them outside the website and source control.
import { Prisma, PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PrismaClient();
const [command, filename] = process.argv.slice(2);
const models = Prisma.dmmf.datamodel.models;
const delegate = (model) => model.name[0].toLowerCase() + model.name.slice(1);
const scalarFields = (model) => model.fields.filter((f) => f.kind !== "object");
const select = (model) => Object.fromEntries(scalarFields(model).map((f) => [f.name, true]));
const canonical = (rows) => rows.map((row) => JSON.stringify(
  Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))
)).sort();

async function verify(data) {
  for (const model of models) {
    const rows = await db[delegate(model)].findMany({ select: select(model) });
    assert.deepEqual(canonical(JSON.parse(JSON.stringify(rows))), canonical(data.tables[model.name]),
      `${model.name}: contents differ`);
    console.log(`${model.name}: ${rows.length} rows verified`);
  }
}

try {
  assert.ok(filename && ["export", "import", "verify"].includes(command),
    "Usage: node scripts/transfer-data.mjs export|import|verify /private/path/data.json");
  if (command === "export") {
    const tables = await db.$transaction(async (tx) => {
      const tables = {};
      for (const model of models) tables[model.name] = await tx[delegate(model)].findMany({ select: select(model) });
      return tables;
    }, { isolationLevel: "Serializable", timeout: 120000 });
    writeFileSync(filename, JSON.stringify({ version: 1, tables }), { mode: 0o600, flag: "wx" });
    console.log("Exported", Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])));
  } else {
    const data = JSON.parse(readFileSync(filename, "utf8"));
    assert.equal(data.version, 1);
    assert.deepEqual(Object.keys(data.tables).sort(), models.map((m) => m.name).sort());
    if (command === "import") {
      // Check every table before writing anything; never overwrite a live DB.
      for (const model of models) assert.equal(await db[delegate(model)].count(), 0, `${model.name} is not empty`);
      // Topological order for FKs; category parents are inserted before children.
      const order = ["AdminUser", "Category", "Product", "BlogPost", "BlogPostProduct", "ClickEvent", "SiteSettings", "ApiCredential", "RateBucket", "SocialConnection", "SocialPostLog"];
      assert.deepEqual([...order].sort(), models.map((m) => m.name).sort());
      await db.$transaction(async (tx) => {
        for (const name of order) {
          const model = models.find((m) => m.name === name);
          const pending = [...data.tables[name]];
          const inserted = new Set();
          while (pending.length) {
            const index = name === "Category" ? pending.findIndex((r) => !r.parentId || inserted.has(r.parentId)) : 0;
            assert.ok(index >= 0, "Category hierarchy has a cycle or missing parent");
            const [row] = pending.splice(index, 1);
            const values = { ...row };
            for (const f of scalarFields(model)) {
              if (f.type === "DateTime" && values[f.name] != null) values[f.name] = new Date(values[f.name]);
            }
            await tx[delegate(model)].create({ data: values });
            inserted.add(row.id);
          }
        }
      }, { timeout: 300000 });
    }
    await verify(data);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
