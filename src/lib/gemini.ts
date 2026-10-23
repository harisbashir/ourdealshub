import { associatesClaimError } from "@/lib/associates-claims";
import { DEFAULT_GEMINI_MODEL, getApiConfig } from "@/lib/api-config";

export type GeminiProductContent = {
  title: string;
  description: string;
};

const DEFAULT_PROMPT = `You are an editor at OurDealsHub, an independent website that recommends products sold on Amazon. Write ORIGINAL editorial copy for one product, using the product facts below as your only source.

The facts come from Amazon. Don't copy Amazon's wording: summarise in your own words and add genuine, useful commentary (who it suits, what stands out, what to check before buying). Never change or embellish a fact.

Rules (Amazon Associates Program Policies and FTC endorsement guidelines):
- Use only facts present in the product title and features. If a detail is missing, leave it out. Never guess specs, sizes, quantities, compatibility or materials.
- Never mention prices, currency amounts, discounts, savings, "% off", sales, bargains, "cheapest", "lowest price", coupons or promo codes.
- Never mention or imply customer reviews, star ratings, review counts, rankings, "best seller", "#1", "Amazon's Choice", "top rated" or popularity.
- Never mention Prime, shipping, delivery, stock levels, availability, warranties or returns.
- No urgency or scarcity ("limited time", "hurry", "today only", "while stocks last").
- Don't claim that you or anyone tested, used or owns the product. No testimonials or quotes.
- No health, medical, safety or legal claims beyond what the source states.
- Don't mention Amazon, ASINs, affiliate links or commissions; the site adds the required disclosures.
- No superlatives the facts can't support ("best", "perfect", "ultimate", "must-have").
- Plain, friendly English. No ALL CAPS. At most two emoji, or none.

Output:
1. title: the real product name, lightly cleaned up (remove keyword stuffing, repeated model numbers and ALL CAPS). Keep the brand and the key identifying details. At most 90 characters.
2. description:
   - One or two opening sentences in your own words: what it is and who it suits.
   - Then 3 to 5 short lines starting with "• ", each one distinct fact from the source in plain words.
   - One closing sentence suggesting what to check on Amazon before buying (for example size, compatibility or the current price).
   - 60 to 160 words in total.

Product title:
{{product_title}}

Product features:
{{product_description}}`;

export async function isGeminiConfigured(): Promise<boolean> {
  return Boolean(await getApiConfig("GEMINI_API_KEY"));
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
  const apiKey = await getApiConfig("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Gemini isn't configured. A Super Admin can add the API key in Admin → Settings → API keys."
    );
  }

  const model = (await getApiConfig("GEMINI_MODEL")) || DEFAULT_GEMINI_MODEL;

  const template = (opts.promptTemplate || DEFAULT_PROMPT).trim();
  let prompt = template
    .replaceAll("{{product_title}}", opts.title)
    .replaceAll("{{product_description}}", opts.description);
  // A custom prompt without placeholders would never see the product facts
  if (!template.includes("{{product_title}}")) {
    prompt += `\n\nProduct title:\n${opts.title}`;
  }
  if (!template.includes("{{product_description}}")) {
    prompt += `\n\nProduct features:\n${opts.description}`;
  }

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
          // Headroom for models that spend output tokens on reasoning
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          // Enforce the shape even if an admin's custom prompt omits it
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              description: { type: "STRING" },
            },
            required: ["title", "description"],
          },
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
    const detail =
      response.status === 404
        ? `model "${model}" isn't available — pick a current model in Admin → Settings → API keys`
        : response.status === 400 || response.status === 403
          ? "the API key was rejected"
          : response.status === 429
            ? "the Gemini quota or rate limit was reached"
            : `HTTP ${response.status}`;
    throw new Error(`Gemini couldn't generate copy: ${detail}.`);
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

/** Admin "Test connection": one tiny request with the saved key + model. */
export async function verifyGemini(): Promise<
  { ok: true; model: string } | { ok: false; error: string }
> {
  try {
    const result = await generateProductContent({
      title: "Stainless steel water bottle, 750 ml",
      description:
        "Double-wall vacuum insulation\nLeak-proof screw lid\nFits most cup holders",
      promptTemplate: "",
    });
    if (!result.title) return { ok: false, error: "Empty response." };
    return {
      ok: true,
      model: (await getApiConfig("GEMINI_MODEL")) || DEFAULT_GEMINI_MODEL,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed." };
  }
}
