import { AddDealWorkspace } from "@/components/admin/AddDealWorkspace";
import { requireProductAccess } from "@/lib/admin-auth";
import { getAdminTrackingId } from "@/lib/admin-tracking";
import { createProductForm } from "@/lib/form-actions";
import { isAmazonConfigured } from "@/lib/amazon";
import { isGeminiConfigured } from "@/lib/gemini";
import { getSiteSettings } from "@/lib/settings";
import { listCategoryOptions } from "@/lib/category-resolve";
import { isSuperAdmin } from "@/lib/permissions";
import Link from "next/link";

export const metadata = { title: "Add Deal — Admin" };

export default async function NewProductPage() {
  const admin = await requireProductAccess();
  const [categories, settings, trackingId, trackingIdUk, trackingIdCa] = await Promise.all([
    listCategoryOptions(),
    getSiteSettings(),
    getAdminTrackingId(admin.id, "US"),
    getAdminTrackingId(admin.id, "UK"),
    getAdminTrackingId(admin.id, "CA"),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add product</h1>
        <p className="text-sm text-muted mt-1">
          Pick US, UK or Canada, then import from Amazon URL/ASIN (uses the matching
          Tracking ID), or paste a deal manually.{" "}
          <Link href="/admin/settings" className="text-brand hover:underline">
            Workflow settings
          </Link>
        </p>
      </div>
      <AddDealWorkspace
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        amazonConfigured={await isAmazonConfigured()}
        geminiConfigured={await isGeminiConfigured()}
        autoPublish={settings.autoPublish}
        hasTrackingId={Boolean(trackingId)}
        trackingIdLabel={trackingId}
        hasTrackingIdCa={Boolean(trackingIdCa)}
        trackingIdLabelCa={trackingIdCa}
        hasTrackingIdUk={Boolean(trackingIdUk)}
        trackingIdLabelUk={trackingIdUk}
        isSuperAdminUser={isSuperAdmin(admin)}
        createAction={createProductForm}
      />
    </div>
  );
}
