import { associatesClaimError } from "@/lib/associates-claims";

export type GeminiProductContent = {
  title: string;
  description: string;
};

const DEFAULT_PROMPT = `You write unique Amazon affiliate product copy for a deals website.

Use ONLY facts present in the product title and description below.
Never invent or include:
- prices, currency amounts ($ £ €), discounts, “% off”, was/now pricing
- coupon / promo codes
- ratings, review counts, or customer quotes
- warranties, shipping, stock, scarcity, or “best deal” claims
- specs or benefits not clearly stated in the source
If something is missing, omit it — never guess.
Do not mention Amazon, ASIN, or affiliate links.

Make each product feel distinct (avoid a copy-paste template across products):
1. title — one concise line; keep the real product name; lightly polish wording.
2. description — short original write-up:
   - Open with 1–2 sentences unique to THIS product (what it is / who it suits), grounded in source facts.
   - Then 4–6 bullets max. Each bullet = one concrete fact from the source. Optional emoji, but vary them; do not force the same structure every time.
   - Close with one plain sentence (no hype, no urgency).
   - Prefer plain language over rigid “Label: fact” patterns when it reads more naturally.
   - Do not pad with filler to hit a bullet count.

Return ONLY valid JSON (no markdown fences, no extra keys):

{
  "title": "...",
  "description": "..."
}

Product Title:
{{product_title}}

Product Description:
{{product_description}}`;

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getDefaultGeminiPrompt() {
  return DEFAULT_PROMPT;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* try fenced or embedded object */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Gemini did not return valid JSON.");
}

function parseGeminiContent(raw: string): GeminiProductContent {
  const parsed = extractJsonObject(raw) as Record<string, unknown>;
  const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
  const description =
    typeof parsed?.description === "string" ? parsed.description.trim() : "";

  if (!title) {
    throw new Error("Gemini response missing a valid title.");
  }
  if (!description) {
    throw new Error("Gemini response missing a valid description.");
  }

  const claimErr = associatesClaimError({ title, description });
  if (claimErr) {
    throw new Error(
      `Gemini output rejected (${claimErr}). Adjust the master prompt or edit manually.`
    );
  }

  return {
    title: title.slice(0, 500),
    description: description.slice(0, 12000),
  };
}

/**
 * Server-only Gemini call. Returns validated { title, description }.
 * API key never leaves this module / process env.
 */
export async function generateProductContent(opts: {
  title: string;
  description: string;
  promptTemplate: string;
}): Promise<GeminiProductContent> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Gemini API is not configured. Set GEMINI_API_KEY on the server."
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const template = (opts.promptTemplate || DEFAULT_PROMPT).trim();
  const prompt = template
    .replaceAll("{{product_title}}", opts.title)
    .replaceAll("{{product_description}}", opts.description);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    throw new Error("Could not reach Gemini API.");
  }

  const data = (await response.json().catch(() => null)) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      "Gemini could not generate product content. Check the server API key and model name."
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseGeminiContent(text);
}
