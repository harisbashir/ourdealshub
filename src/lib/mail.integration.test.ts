import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "./prisma";
import { recordSystemEvent, createChangeNotifier } from "./system-events";
import { processMailQueue } from "./mail-worker";
import { sealSecret } from "./secret-box";
import { getMailAdminData } from "./mail-settings";

test("mail preferences, grouping, concurrent claims and uncertain delivery", async () => {
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
  assert.equal(await prisma.mailDelivery.count(), 0, "Use an empty test database");
  const savedSettings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  try {
    await prisma.mailSettings.upsert({ where: { id: "default" }, create: { enabled: false }, update: { enabled: false } });
    await recordSystemEvent({ category: "content", title: "Paused event" });
    assert.equal((await prisma.systemEvent.findFirstOrThrow({ where: { title: "Paused event" } })).mailStatus, "suppressed");
    const notify = createChangeNotifier("settings", "Settings saved");
    await notify(); await notify();
    assert.equal(await prisma.systemEvent.count({ where: { title: "Settings saved" } }), 1);
    await prisma.mailSettings.update({ where: { id: "default" }, data: { enabled: true, provider: "gmail", username: "sender@test.invalid", recipient: "admin@test.invalid", fromAddress: "sender@test.invalid", password: sealSecret("app-password-PRIVATE"), notifyContent: false, workerLeaseUntil: null } });
    await recordSystemEvent({ category: "content", title: "Unselected category" });
    assert.equal((await prisma.systemEvent.findFirstOrThrow({ where: { title: "Unselected category" } })).mailStatus, "suppressed");
    await recordSystemEvent({ category: "operations", title: "Routine change", dedupeKey: "routine-once" });
    await recordSystemEvent({ category: "operations", title: "Routine change", dedupeKey: "routine-once" });
    assert.equal(await prisma.systemEvent.count({ where: { dedupeKey: "routine-once" } }), 1);
    let sent = 0;
    const messages: string[] = [];
    const send = async (_settings: unknown, message: { text: string }) => { sent++; messages.push(message.text); await new Promise((resolve) => setTimeout(resolve, 30)); return "test-message"; };
    assert.equal((await processMailQueue({ send })).processed, 0, "Routine events wait for the digest interval");
    await recordSystemEvent({ category: "security", title: "Urgent event", level: "error" });
    await Promise.all([processMailQueue({ send }), processMailQueue({ send })]);
    assert.equal(sent, 1); assert.ok(messages[0].includes("Urgent event")); assert.ok(messages[0].includes("Routine change"));
    assert.ok(!messages[0].includes("app-password-PRIVATE"));
    await processMailQueue({ send }); assert.equal(sent, 1, "Confirmed emails are not sent twice");
    const view = await getMailAdminData();
    assert.ok(!JSON.stringify(view).includes("app-password-PRIVATE"));
    assert.ok(!JSON.stringify(view).includes("enc:v1:"));
    await recordSystemEvent({ category: "operations", title: "Interrupted write", level: "error" });
    const result = await processMailQueue({ send: async () => { throw { command: "DATA", code: "ETIMEDOUT", message: "PRIVATE" }; } });
    assert.equal(result.status, "uncertain");
    await processMailQueue({ send }); assert.equal(sent, 1, "Uncertain writes are never retried automatically");
    const uncertain = await prisma.mailDelivery.findFirstOrThrow({ where: { status: "uncertain" } });
    assert.ok(!uncertain.error?.includes("PRIVATE"));
    // Tests work with alerts paused, and retries of activity deliveries are drainable.
    await prisma.mailSettings.update({ where: { id: "default" }, data: { enabled: false } });
    const testEmail = await prisma.mailDelivery.create({ data: { kind: "test", recipient: "admin@test.invalid", subject: "Test", text: "Explicit test" } });
    assert.equal((await processMailQueue({ testId: testEmail.id, send })).status, "sent");
    await prisma.mailSettings.update({ where: { id: "default" }, data: { enabled: true } });
    await prisma.mailDelivery.update({ where: { id: uncertain.id }, data: { status: "queued" } });
    assert.equal((await processMailQueue({ send })).status, "sent");
  } finally {
    await prisma.systemEvent.deleteMany(); await prisma.mailDelivery.deleteMany();
    if (savedSettings) await prisma.mailSettings.update({ where: { id: "default" }, data: savedSettings });
    else await prisma.mailSettings.deleteMany();
    await prisma.$disconnect();
  }
});
