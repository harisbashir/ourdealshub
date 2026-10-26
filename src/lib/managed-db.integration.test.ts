import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "./prisma";
import { getClickAnalytics } from "./click-analytics";
import { getOpsInsights } from "./ops-insights";
import { adminProductWhere } from "./product-query";
import { rateLimitDurable } from "./rate-limit-durable";

test("MariaDB search, UTC analytics, owner filtering and durable limits", async () => {
  // Explicitly isolated DB: this suite must never insert fixtures into the site.
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
  assert.equal(await prisma.product.count(), 0, "Use an empty test database");
  const a = await prisma.adminUser.create({ data: { email: "a@test.invalid", name: "A", passwordHash: "test" } });
  const b = await prisma.adminUser.create({ data: { email: "b@test.invalid", name: "B", passwordHash: "test" } });
  const category = await prisma.category.create({ data: { name: "Test", slug: "test" } });
  try {
    const products = [];
    for (const [index, owner] of [a, b].entries()) {
      products.push(await prisma.product.create({ data: {
        title: "Mixed CASE Café " + index, slug: "test-" + index,
        categoryId: category.id, createdById: owner.id, marketplace: index ? "UK" : "US",
        imageUrl: "https://m.media-amazon.com/images/I/test.jpg",
        affiliateUrl: "https://www.amazon.com/dp/B000000001?tag=test-20",
        clickCount: index ? 1 : 2,
      } }));
    }
    const stamp = new Date();
    stamp.setUTCHours(0, 0, 0, 1);
    await prisma.clickEvent.createMany({ data: [
      { productId: products[0].id, createdAt: stamp, campaign: "email" },
      { productId: products[0].id, createdAt: stamp, campaign: null },
      { productId: products[1].id, createdAt: stamp, campaign: "email" },
    ] });
    const results = await prisma.product.findMany({ where: adminProductWhere({ adminId: a.id, q: "mixed case café" }) });
    assert.deepEqual(results.map((p) => p.id), [products[0].id]);
    const all = await getClickAnalytics(7);
    const own = await getClickAnalytics(7, { ownerAdminId: a.id });
    assert.equal(all.totalClicks, 3);
    assert.equal(own.totalClicks, 2);
    assert.equal(all.clicksByDay.find((d) => d.day === stamp.toISOString().slice(0, 10))?.count, 3);
    assert.equal(own.topProducts.length, 1);
    assert.equal(own.byCategory[0].count, 2);
    assert.equal(own.byAdmin[0].id, a.id);
    assert.deepEqual(own.byMarketplace.map((m) => m.id), ["US"]);
    const insights = await getOpsInsights(7);
    assert.equal(insights.byCampaign.find((c) => c.campaign === "direct")?.count, 1);
    assert.equal(insights.clicksByMarketplace.length, 2);
    assert.equal((await rateLimitDurable("integration", 1, 60000)).ok, true);
    assert.equal((await rateLimitDurable("integration", 1, 60000)).ok, false);
  } finally {
    await prisma.product.deleteMany({ where: { categoryId: category.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.adminUser.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await prisma.rateBucket.deleteMany({ where: { key: "integration" } });
    await prisma.$disconnect();
  }
});

// This test runs after the analytics fixture has been cleaned up.
test("Canada owner tags, samples and queued social delivery stay isolated", async () => {
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
  const { getAdminTrackingId, trackingIdForProductUpdate } = await import("./admin-tracking");
  const { addDemoCatalog, removeDemoCatalog } = await import("./demo-catalog");
  const { autoPostPublishedDeal, processSocialQueue } = await import("./social-publish");
  const superAdmin = await prisma.adminUser.create({ data: { name: "Sample owner", email: "sample-owner@test.invalid", passwordHash: "test", role: "SUPER_ADMIN", amazonTrackingId: "us-owner-20", amazonTrackingIdCa: "ca-owner-20" } });
  const staff = await prisma.adminUser.create({ data: { name: "CA staff", email: "ca-staff@test.invalid", passwordHash: "test", amazonTrackingIdCa: "ca-staff-20" } });
  const category = await prisma.category.create({ data: { name: "Samples", slug: "samples-test" } });
  const previousSettings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  try {
    assert.equal(await getAdminTrackingId(superAdmin.id, "CA"), "ca-owner-20");
    assert.equal(await getAdminTrackingId(superAdmin.id, "UK"), null);
    assert.equal(await trackingIdForProductUpdate(superAdmin, { createdById: staff.id, trackingId: "old-ca-20", marketplace: "CA" }), "ca-staff-20");
    assert.equal(await addDemoCatalog(superAdmin.id), 12);
    assert.equal(await addDemoCatalog(superAdmin.id), 0);
    assert.equal(await prisma.product.count({ where: { isDemo: true, marketplace: "CA" } }), 4);
    await prisma.siteSettings.upsert({ where: { id: "default" }, create: { id: "default", socialAutoPost: true }, update: { socialAutoPost: true } });
    await prisma.socialConnection.create({ data: { platform: "pinterest", pageId: "123", accessToken: "test-token", isActive: true } });
    const demo = await prisma.product.findFirstOrThrow({ where: { isDemo: true } });
    assert.deepEqual(await autoPostPublishedDeal(demo.id), []);
    assert.equal(await prisma.socialDelivery.count(), 0);
    const product = await prisma.product.create({ data: { title: "Canada fixture", slug: "canada-fixture", categoryId: category.id, createdById: staff.id, marketplace: "CA", imageUrl: "https://m.media-amazon.com/images/I/test.jpg", affiliateUrl: "https://www.amazon.ca/dp/B000000001?tag=ca-staff-20" } });
    await autoPostPublishedDeal(product.id);
    await autoPostPublishedDeal(product.id);
    assert.equal(await prisma.socialDelivery.count({ where: { productId: product.id, platform: "pinterest" } }), 1);
    // Claim processing twice concurrently: only one worker can send a request.
    const savedFetch = globalThis.fetch;
    const savedOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    let writes = 0;
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.com";
    globalThis.fetch = async () => { writes++; return Response.json({ id: "published-pin" }); };
    try {
      await Promise.all([processSocialQueue(1), processSocialQueue(1)]);
      assert.equal(writes, 1);
      assert.equal((await prisma.socialDelivery.findFirstOrThrow({ where: { productId: product.id } })).status, "published");
      await autoPostPublishedDeal(product.id);
      await processSocialQueue(1);
      assert.equal(writes, 1, "Never resend a successfully published deal");
    } finally { globalThis.fetch = savedFetch; process.env.NEXT_PUBLIC_SITE_URL = savedOrigin; }
    assert.equal(await removeDemoCatalog(), 12);
    assert.ok(await prisma.product.findUnique({ where: { id: product.id } }), "Removing samples preserves real deals");
  } finally {
    await prisma.product.deleteMany({ where: { createdById: { in: [superAdmin.id, staff.id] } } });
    await prisma.socialConnection.deleteMany({ where: { platform: "pinterest" } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.adminUser.deleteMany({ where: { id: { in: [superAdmin.id, staff.id] } } });
    if (previousSettings) await prisma.siteSettings.update({ where: { id: "default" }, data: { socialAutoPost: previousSettings.socialAutoPost } });
    else await prisma.siteSettings.deleteMany({ where: { id: "default" } });
    await prisma.$disconnect();
  }
});
