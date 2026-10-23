"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";
import {
  API_CONFIG_FIELDS,
  resolveApiConfig,
  setApiConfig,
  type ApiConfigKey,
} from "@/lib/api-config";
import { verifyAmazonCredentials } from "@/lib/amazon";
import { verifyGemini } from "@/lib/gemini";
import { parseAccent } from "@/lib/theme";
import { rateLimitDurable } from "@/lib/rate-limit-durable";

export type ActionResult = { ok: boolean; message: string };

/**
 * Save API keys from Settings. A blank secret field means "keep the current
 * value" (secrets are never sent to the browser); tick "Remove" to clear one.
 */
export async function saveApiKeys(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const changed: string[] = [];

  for (const field of API_CONFIG_FIELDS) {
    const raw = formData.get(field.key);
    const clear = formData.get(`${field.key}__clear`) === "on";
    if (clear) {
      await setApiConfig(field.key, "", admin.id);
      changed.push(`${field.label} removed`);
      continue;
    }
    if (raw === null) continue;
    const value = String(raw).trim();
    if (field.secret && !value) continue; // keep existing secret
    if (field.options && value && !field.options.includes(value)) {
      return { ok: false, message: `${field.label}: choose one of the listed values.` };
    }
    if (/\s/.test(value) && field.secret) {
      return { ok: false, message: `${field.label} can't contain spaces.` };
    }
    // Don't store an unchanged dropdown value: it would freeze today's default
    if (!field.secret) {
      const current = await resolveApiConfig(field.key, { fresh: true });
      if (current.value === value && current.source !== "database") continue;
    }
    await setApiConfig(field.key as ApiConfigKey, value, admin.id);
    if (value) changed.push(field.label);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return {
    ok: true,
    message: changed.length ? "Saved. Use Test to check each connection." : "No changes.",
  };
}

export async function testApiConnection(
  target: "gemini" | "amazon-us" | "amazon-uk"
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const limited = await rateLimitDurable(`api-test:${admin.id}`, 20, 15 * 60_000);
  if (!limited.ok) {
    return { ok: false, message: "Too many tests. Try again in a few minutes." };
  }
  if (target === "gemini") {
    const r = await verifyGemini();
    return r.ok
      ? { ok: true, message: `Gemini is working (${r.model}).` }
      : { ok: false, message: r.error };
  }
  const market = target === "amazon-uk" ? "UK" : "US";
  const r = await verifyAmazonCredentials(market);
  return r.ok
    ? { ok: true, message: `Signed in to the Amazon Creators API (${market}).` }
    : { ok: false, message: r.error };
}

export async function updateAccentTheme(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requireSuperAdmin();
  const accentTheme = parseAccent(String(formData.get("accentTheme") || ""));
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", accentTheme },
    update: { accentTheme },
  });
  // Every page reads the accent in its layout
  revalidatePath("/", "layout");
  return { ok: true, message: "Colour theme updated." };
}
