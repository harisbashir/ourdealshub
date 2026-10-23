import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { updateSiteSettings } from "@/lib/import-product";
import { getSiteSettings } from "@/lib/settings";
import { isAmazonConfigured } from "@/lib/amazon";
import { isGeminiConfigured } from "@/lib/gemini";
import { GoLiveChecklist } from "@/components/admin/GoLiveChecklist";
import { getGoLiveReadiness } from "@/lib/go-live-readiness";

export const metadata = { title: "Settings — Admin" };

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 font-medium ${
        ok
          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
          : "bg-amber-500/15 text-amber-700 border-amber-500/35 dark:text-amber-400"
      }`}
    >
      {label} {ok ? "ready" : "not set"}
    </span>
  );
}

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const [settings, categories, readiness] = await Promise.all([
    getSiteSettings(),
    prisma.category.findMany({
      where: { parentId: null, NOT: { slug: "trending" } },
      orderBy: { sortOrder: "asc" },
    }),
    getGoLiveReadiness(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Deal workflow settings
      </h1>
      <p className="text-sm text-muted mb-6">
        Configure Auto Publish and the Gemini master prompt. API keys stay in
        server environment variables. Tracking IDs are managed under Admins.
      </p>

      <GoLiveChecklist
        items={readiness.items}
        readyExceptApis={readiness.readyExceptApis}
        apisReady={readiness.apisReady}
      />

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <StatusPill ok={isAmazonConfigured()} label="Amazon API" />
        <StatusPill ok={isGeminiConfigured()} label="Gemini API" />
      </div>

      <form
        action={updateSiteSettings}
        className="admin-shell-static space-y-5 rounded-xl bg-card border border-border p-6 shadow-sm"
      >
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="autoPublish"
            defaultChecked={settings.autoPublish}
            className="mt-0.5 rounded border-border text-brand focus:ring-brand"
          />
          <span>
            <strong className="text-foreground">Auto Publish</strong>
            <span className="text-muted">
              {" "}
              — when ON, URL → fetch → Gemini → save → publish with no review
              step. Keep OFF until you trust output (Associates: no invented
              prices/coupons).
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="socialAutoPost"
            defaultChecked={settings.socialAutoPost}
            className="mt-0.5 rounded border-border text-brand focus:ring-brand"
          />
          <span>
            <strong className="text-foreground">Social auto-post</strong>
            <span className="text-muted">
              {" "}
              — when a deal becomes published, post to connected Facebook /
              Threads / Telegram (Automation). Uses tracked{" "}
              <code className="text-xs bg-card-muted text-foreground px-1 rounded border border-border">
                /go?src=
              </code>{" "}
              links for click attribution.
            </span>
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Fallback category (only if Amazon returns no browse data)
          </label>
          <select
            name="defaultCategoryId"
            defaultValue={settings.defaultCategoryId || ""}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="">First main category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-fg">
            Normal imports auto-create main + sub categories from Amazon browse
            nodes — you do not pick a category each time.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Gemini master prompt / template
          </label>
          <p className="text-xs text-muted mb-2">
            Use placeholders{" "}
            <code className="bg-card-muted text-foreground px-1 rounded border border-border">
              {"{{product_title}}"}
            </code>{" "}
            and{" "}
            <code className="bg-card-muted text-foreground px-1 rounded border border-border">
              {"{{product_description}}"}
            </code>
            . Do not ask the model to invent prices or specs.
          </p>
          <textarea
            name="geminiPromptTemplate"
            rows={16}
            defaultValue={settings.geminiPromptTemplate}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-mono text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
