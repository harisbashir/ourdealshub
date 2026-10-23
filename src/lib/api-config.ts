import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret } from "@/lib/secret-box";

/**
 * API keys and settings a Super Admin can manage from Admin → Settings.
 * Resolution order: database (sealed with secret-box) → env var of the same
 * name → built-in default. Server-only: never import from client components.
 */

export type ApiConfigKey =
  | "GEMINI_API_KEY"
  | "GEMINI_MODEL"
  | "AMAZON_US_CREDENTIAL_ID"
  | "AMAZON_US_CREDENTIAL_SECRET"
  | "AMAZON_US_CREDENTIAL_VERSION"
  | "AMAZON_UK_CREDENTIAL_ID"
  | "AMAZON_UK_CREDENTIAL_SECRET"
  | "AMAZON_UK_CREDENTIAL_VERSION";

export type ApiConfigField = {
  key: ApiConfigKey;
  label: string;
  group: "gemini" | "amazon-us" | "amazon-uk";
  /** Secrets are never sent back to the browser — only a masked hint. */
  secret: boolean;
  placeholder?: string;
  defaultValue?: string;
  /** Allowed values (rendered as a select). */
  options?: string[];
};

/** Current Gemini models per ai.google.dev/gemini-api/docs/deprecations (Oct 2026). */
export const GEMINI_MODEL_OPTIONS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
];

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/** Creators API credential versions: 2.x = Cognito, 3.x = Login with Amazon. */
export const CREDENTIAL_VERSION_OPTIONS = ["3.1", "3.2", "3.3", "2.1", "2.2", "2.3"];

export const API_CONFIG_FIELDS: ApiConfigField[] = [
  {
    key: "GEMINI_API_KEY",
    label: "Gemini API key",
    group: "gemini",
    secret: true,
    placeholder: "AIza…",
  },
  {
    key: "GEMINI_MODEL",
    label: "Gemini model",
    group: "gemini",
    secret: false,
    defaultValue: DEFAULT_GEMINI_MODEL,
    options: GEMINI_MODEL_OPTIONS,
  },
  {
    key: "AMAZON_US_CREDENTIAL_ID",
    label: "Credential ID",
    group: "amazon-us",
    secret: true,
  },
  {
    key: "AMAZON_US_CREDENTIAL_SECRET",
    label: "Credential secret",
    group: "amazon-us",
    secret: true,
  },
  {
    key: "AMAZON_US_CREDENTIAL_VERSION",
    label: "Credential version",
    group: "amazon-us",
    secret: false,
    defaultValue: "3.1",
    options: CREDENTIAL_VERSION_OPTIONS,
  },
  {
    key: "AMAZON_UK_CREDENTIAL_ID",
    label: "Credential ID",
    group: "amazon-uk",
    secret: true,
  },
  {
    key: "AMAZON_UK_CREDENTIAL_SECRET",
    label: "Credential secret",
    group: "amazon-uk",
    secret: true,
  },
  {
    key: "AMAZON_UK_CREDENTIAL_VERSION",
    label: "Credential version",
    group: "amazon-uk",
    secret: false,
    defaultValue: "3.2",
    options: CREDENTIAL_VERSION_OPTIONS,
  },
];

const FIELD_BY_KEY = new Map(API_CONFIG_FIELDS.map((f) => [f.key, f]));

export function isApiConfigKey(key: string): key is ApiConfigKey {
  return FIELD_BY_KEY.has(key as ApiConfigKey);
}

// Short cache so hot paths (imports, cron) don't hit the DB per call.
// Next.js may load separate module instances for server actions and page
// rendering, so clearing it after a save doesn't reach every instance: the
// admin screen always reads fresh, and the TTL bounds staleness elsewhere.
const CACHE_MS = 10_000;
let cache: { at: number; values: Map<string, string> } | null = null;

async function loadDbValues(fresh = false): Promise<Map<string, string>> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.values;
  const values = new Map<string, string>();
  try {
    const rows = await prisma.apiCredential.findMany();
    for (const row of rows) {
      try {
        const plain = openSecret(row.value);
        if (plain) values.set(row.key, plain);
      } catch {
        // Undecryptable (AUTH_SECRET rotated) — treat as unset so env applies
      }
    }
  } catch {
    // DB unavailable — fall back to env only
  }
  cache = { at: Date.now(), values };
  return values;
}

export function clearApiConfigCache() {
  cache = null;
}

export type ApiConfigSource = "database" | "env" | "default" | "unset";

/** Models Google has shut down — a stale setting must not break AI copy. */
export function isRetiredGeminiModel(model: string): boolean {
  return /^gemini-(1\.|2\.0)/i.test(model.trim());
}

function usable(key: ApiConfigKey, value: string | undefined): value is string {
  if (!value) return false;
  if (key === "GEMINI_MODEL" && isRetiredGeminiModel(value)) return false;
  return true;
}

export async function resolveApiConfig(
  key: ApiConfigKey,
  opts?: { fresh?: boolean }
): Promise<{ value: string; source: ApiConfigSource }> {
  const db = await loadDbValues(opts?.fresh);
  const fromDb = db.get(key)?.trim();
  if (usable(key, fromDb)) return { value: fromDb, source: "database" };
  const fromEnv = process.env[key]?.trim();
  if (usable(key, fromEnv)) return { value: fromEnv, source: "env" };
  const def = FIELD_BY_KEY.get(key)?.defaultValue;
  if (def) return { value: def, source: "default" };
  return { value: "", source: "unset" };
}

export async function getApiConfig(key: ApiConfigKey): Promise<string> {
  return (await resolveApiConfig(key)).value;
}

/** Masked view for the admin UI — secrets show only their last 4 characters. */
export async function describeApiConfig(): Promise<
  {
    field: ApiConfigField;
    source: ApiConfigSource;
    display: string;
  }[]
> {
  const out = [];
  await loadDbValues(true); // the admin screen must reflect a save immediately
  for (const field of API_CONFIG_FIELDS) {
    const { value, source } = await resolveApiConfig(field.key);
    const display = !value
      ? ""
      : field.secret
        ? `•••• ${value.slice(-4)}`
        : value;
    out.push({ field, source, display });
  }
  return out;
}

/** Save (or clear with an empty value) one key. Caller must be a Super Admin. */
export async function setApiConfig(
  key: ApiConfigKey,
  value: string,
  updatedById: string
): Promise<void> {
  const trimmed = value.trim().slice(0, 4000);
  if (!trimmed) {
    await prisma.apiCredential.deleteMany({ where: { key } });
  } else {
    const sealed = sealSecret(trimmed);
    await prisma.apiCredential.upsert({
      where: { key },
      create: { key, value: sealed, updatedById },
      update: { value: sealed, updatedById },
    });
  }
  clearApiConfigCache();
}
