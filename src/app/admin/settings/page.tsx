import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { updateSiteSettings } from "@/lib/import-product";
import { getSiteSettings } from "@/lib/settings";
import { getDefaultGeminiPrompt } from "@/lib/gemini";
import { describeApiConfig } from "@/lib/api-config";
import { GoLiveChecklist } from "@/components/admin/GoLiveChecklist";
import { getGoLiveReadiness } from "@/lib/go-live-readiness";
import { AccentPicker, ApiKeysForm } from "@/components/admin/SettingsForms";
import {
  AdminCard,
  PageHeader,
  SectionHeader,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/admin/ui";

export const metadata = { title: "Settings" };

const SECTIONS = [
  ["#appearance", "Appearance"],
  ["#api-keys", "API Keys"],
  ["#publishing", "Publishing"],
  ["#ai-prompt", "AI Prompt"],
  ["#go-live", "Go-Live"],
];

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const [settings, categories, readiness, apiViews] = await Promise.all([
    getSiteSettings(),
    prisma.category.findMany({
      where: { parentId: null, NOT: { slug: "trending" } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    getGoLiveReadiness(),
    describeApiConfig(),
  ]);
  const usingDefaultPrompt =
    settings.geminiPromptTemplate.trim() === getDefaultGeminiPrompt().trim();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Settings"
        description="Site appearance, API keys, publishing and the AI writing prompt. Tracking IDs are set per person under Admins."
      />

      <nav aria-label="Settings sections" className="scrollbar-hide -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        {SECTIONS.map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="pressable inline-flex h-10 shrink-0 items-center rounded-full bg-card px-4 text-[15px] font-medium text-foreground ring-1 ring-border hover:bg-card-muted"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        <AdminCard id="appearance">
          <SectionHeader
            title="Colour Theme"
            description="The accent colour used for buttons, links and highlights across the site and admin. Visitors still choose light or dark mode for themselves."
          />
          <AccentPicker current={settings.accentTheme} />
        </AdminCard>

        <AdminCard id="api-keys">
          <SectionHeader
            title="API Keys"
            description="Connect Gemini and the Amazon Creators API. Only Super Admins can see or change these."
          />
          <ApiKeysForm views={apiViews} />
        </AdminCard>

        <form action={updateSiteSettings} className="space-y-6">
          <AdminCard id="publishing">
            <SectionHeader title="Publishing" />
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" name="autoPublish" defaultChecked={settings.autoPublish} className="mt-1 h-5 w-5" />
                <span>
                  <span className={labelClass}>Publish imported deals immediately</span>
                  <span className={`${hintClass} block`}>
                    When on, pasting an Amazon link publishes the deal with no review step. Keep it
                    off until you trust the AI copy.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" name="socialAutoPost" defaultChecked={settings.socialAutoPost} className="mt-1 h-5 w-5" />
                <span>
                  <span className={labelClass}>Post new deals to social channels</span>
                  <span className={`${hintClass} block`}>
                    Shares each newly published deal to the channels connected under{" "}
                    <Link href="/admin/automation" className="text-brand underline">Automation</Link>.
                  </span>
                </span>
              </label>
              <div>
                <label htmlFor="defaultCategoryId" className={labelClass}>
                  Fallback category
                </label>
                <select
                  id="defaultCategoryId"
                  name="defaultCategoryId"
                  defaultValue={settings.defaultCategoryId || ""}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">First main category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className={hintClass}>
                  Used only when Amazon doesn&apos;t say which category a product is in.
                  Otherwise categories are created from Amazon automatically.
                </p>
              </div>
              <button type="submit" className={primaryButtonClass}>
                Save Settings
              </button>
            </div>
          </AdminCard>

          <AdminCard id="ai-prompt">
            <SectionHeader
              title="AI Writing Prompt"
              description={
                usingDefaultPrompt
                  ? "Using the recommended prompt, written against Amazon Associates policies and FTC guidance."
                  : "Using a custom prompt. The recommended prompt is written against Amazon Associates policies."
              }
            />
            <details className="mb-4 rounded-xl bg-card-muted p-4">
              <summary className="text-[15px] font-medium text-foreground">
                What the recommended prompt enforces
              </summary>
              <ul className="prose-page mt-2 list-disc space-y-1 pl-5 text-[13px]">
                <li>Original commentary, not a copy of Amazon&apos;s listing (Associates require &ldquo;significant commentary, analysis, or transformation&rdquo;).</li>
                <li>Only facts from Amazon&apos;s title and features; nothing guessed.</li>
                <li>No prices, discounts, coupons or &ldquo;deal&rdquo; claims; prices may only come from Amazon&apos;s live data.</li>
                <li>No reviews, star ratings, rankings, &ldquo;Best Seller&rdquo; or &ldquo;Amazon&apos;s Choice&rdquo; (Program Policies §6(t)).</li>
                <li>No Prime, shipping, stock or urgency claims; no invented first-hand testing (FTC).</li>
                <li>Every result is also checked by code before saving; anything that breaks these rules is rejected.</li>
              </ul>
            </details>
            <label htmlFor="geminiPromptTemplate" className={labelClass}>
              Prompt
            </label>
            <p className={hintClass}>
              Placeholders: <code>{"{{product_title}}"}</code> and <code>{"{{product_description}}"}</code>.
              The reply format (title + description) is enforced automatically.
            </p>
            <textarea
              id="geminiPromptTemplate"
              name="geminiPromptTemplate"
              rows={14}
              defaultValue={settings.geminiPromptTemplate}
              className={`${inputClass} mt-2 font-mono text-[13px] leading-relaxed`}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass}>
                Save Settings
              </button>
              {!usingDefaultPrompt && (
                <button type="submit" name="resetPrompt" value="1" className={secondaryButtonClass}>
                  Use Recommended Prompt
                </button>
              )}
            </div>
          </AdminCard>
        </form>

        <div id="go-live" className="scroll-mt-20">
          <GoLiveChecklist
            items={readiness.items}
            readyExceptApis={readiness.readyExceptApis}
            apisReady={readiness.apisReady}
          />
        </div>
      </div>
    </div>
  );
}
