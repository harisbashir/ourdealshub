/**
 * Platform posting styles for OurDealsHub Amazon affiliate shares.
 *
 * Encodes (not legal advice — always keep disclosures clear & conspicuous):
 *
 * Amazon Associates (Associates Central / Operating Agreement)
 * - Link-level disclosure near every Special Link: "#ad", "#CommissionsEarned", or "(paid link)"
 * - Site/account statement: “As an Amazon Associate I earn from qualifying purchases.”
 *   For social UGC this statement must be associated with the account (bio OK when post is tight)
 * - Register full public profile URLs in Associates Central (not just the network name)
 * - Use tagged Special Links; do not cloak/obscure origin (avoid shady shorteners / hidden redirects)
 * - No unverifiable price/% off / coupon claims (see associates-claims.ts)
 *
 * FTC Endorsement Guides / Disclosures 101
 * - Material connection (incl. affiliate commission) must be obvious before “See more”
 * - Don’t bury disclosure in a hashtag pile; platform “Paid partnership” alone is not enough
 *
 * Platform APIs / observed limits (2025–2026)
 * - Facebook Page feed: message + optional `link`; fold ~477 chars; composer ceiling ~63,206
 * - Threads API: text ≤500 (emoji = UTF-8 bytes); ≤5 unique links; link_attachment; 250 posts / 24h
 * - Instagram: caption ≤2,200; ~125 before “more”; caption URLs not clickable → bio / Stories sticker
 * - Telegram Bot API: text ≤4,096; media caption ≤1,024
 * - Pinterest API v5: title ≤100, description ≤800, link ≤2,048; mark affiliate where supported
 * - X API: standard 280 weighted chars (Premium up to 25k) — we target 280 for automation safety
 */

import type { SocialPlatform } from "@/lib/social-connections";
import { marketplaceSocialLine } from "@/lib/marketplace";

export type ShareDealInput = {
  title: string;
  geminiText: string;
  affiliateUrl: string;
  dealUrl: string;
  goUrl: string;
  categoryName?: string;
  marketplace?: string | null;
};

export type PlatformRules = {
  platform: SocialPlatform;
  /** Hard / API text budget we enforce when building captions */
  maxChars: number;
  /** Chars usually visible before “See more” / fold (write for this first) */
  previewFold: number | null;
  /** Whether a URL in the main text is clickable for users */
  linksClickableInCaption: boolean;
  /** Prefer putting the Special Link in a dedicated API field */
  preferLinkField: boolean;
  /** Max unique URLs allowed in one post (Threads API) */
  maxUniqueLinks: number | null;
  /** Where the Amazon OA statement should live */
  amazonStatementPlacement: "post" | "bio_ok" | "bio_required";
  /** Suggested operator / bio checklist */
  notes: string[];
};

export type PlatformPost = {
  platform: SocialPlatform;
  caption: string;
  charCount: number;
  maxChars: number;
  /** Weighted/UTF-8 aware count when it differs (Threads emoji bytes ≈ JS length for ASCII) */
  countLabel: string;
  /** Tagged Amazon Special Link — primary click target */
  linkUrl: string;
  /** Optional Graph/Threads/Pinterest link field (same URL; kept separate for publishers) */
  linkAttachment?: string;
  title?: string;
  /** IG: hashtag / extra disclosure dump (not a reliable clickable link channel) */
  firstComment?: string;
  /** IG/X: what bio should say / point to */
  bioHint?: string;
  /** Media caption variant (Telegram photo posts ≤1,024) */
  mediaCaption?: string;
  /** Flags for future publishers */
  flags: {
    paidPartnershipSuggested: boolean;
    isAffiliateLink: boolean;
    maxUniqueLinks: number | null;
  };
  notes: string[];
  rules: PlatformRules;
};

/** Exact OA phrasing Amazon still publishes (comma optional in practice). */
export const AMAZON_STATEMENT =
  "As an Amazon Associate I earn from qualifying purchases.";

const LINK_LEVEL = "#ad";
const LINK_LEVEL_ALT = "#CommissionsEarned";

export const PLATFORM_RULES: Record<SocialPlatform, PlatformRules> = {
  facebook: {
    platform: "facebook",
    maxChars: 2000, // well under ~63,206; keep posts readable
    previewFold: 450,
    linksClickableInCaption: true,
    preferLinkField: true,
    maxUniqueLinks: null,
    amazonStatementPlacement: "post",
    notes: [
      "Put #ad in the first line — before Facebook’s ~450-char “See more” fold (FTC + Amazon).",
      "Graph API: POST /{page-id}/feed with message + link (Special Link as `link`).",
      "Include the full Amazon Associate statement in the post body.",
      "Optional Meta Branded Content / Paid partnership — still keep our own #ad text.",
      "Register this Page’s full public URL in Associates Central.",
      "No % off, coupons, was/now, or scarcity claims.",
    ],
  },
  threads: {
    platform: "threads",
    maxChars: 500,
    previewFold: 500,
    linksClickableInCaption: true,
    preferLinkField: true,
    maxUniqueLinks: 5,
    amazonStatementPlacement: "bio_ok",
    notes: [
      "Threads API text posts: hard 500-character limit (emoji counted as UTF-8 bytes).",
      "≤5 unique URLs per post or publish fails (THREADS_API__LINK_LIMIT_EXCEEDED).",
      "Use link_attachment for the affiliate URL; keep only one URL in text when possible.",
      "Publishing quota: ~250 API posts per rolling 24 hours.",
      "#ad up front; #CommissionsEarned beside the link; OA statement in bio if space is tight.",
      "Register the full Threads profile URL in Associates Central.",
    ],
  },
  instagram: {
    // Caption has no Amazon URL — bio/link tool must use the website deal page.
    platform: "instagram",
    maxChars: 2200,
    previewFold: 125,
    linksClickableInCaption: false,
    preferLinkField: false,
    maxUniqueLinks: null,
    amazonStatementPlacement: "post",
    notes: [
      "Caption URLs are NOT clickable — do not waste the hook on a raw Amazon URL.",
      "CTA: “link in bio” or Stories link sticker (clickable surfaces).",
      "#ad must sit in the first ~125 characters (before “more”) — FTC conspicuous rule.",
      "Paid partnership label alone is not enough; keep explicit #ad / affiliate wording.",
      "Put full Amazon Associate statement in the caption (account association).",
      "First comment: hashtags / extra disclosure — not a reliable shop link.",
      "Register the full Instagram profile URL in Associates Central.",
    ],
  },
  telegram: {
    platform: "telegram",
    maxChars: 4096,
    previewFold: null,
    linksClickableInCaption: true,
    preferLinkField: false,
    maxUniqueLinks: null,
    amazonStatementPlacement: "post",
    notes: [
      "Bot API sendMessage: text 1–4,096 chars after entities; media captions ≤1,024.",
      "Prefer plain text + autolinked Special Link (HTML parse_mode needs & < > escaped).",
      "#ad near the affiliate link; full Amazon Associate statement in the same message.",
      "Bot must be channel/group admin with post rights; avoid >1 msg/sec to one chat.",
      "No cloaked shorteners — Amazon wants trackable Special Links from your Site.",
    ],
  },
  pinterest: {
    platform: "pinterest",
    maxChars: 800, // API v5 description max
    previewFold: 50,
    linksClickableInCaption: false, // destination is the pin `link` field
    preferLinkField: true,
    maxUniqueLinks: 1,
    amazonStatementPlacement: "post",
    notes: [
      "API v5: title ≤100, description ≤800, link ≤2,048.",
      "Destination `link` must be the tagged Amazon product URL (product detail page).",
      "Mark affiliate/sponsored when the API exposes is_affiliate_link / commercial tools.",
      "#ad near the start of the description + full Amazon Associate statement.",
      "Pinterest lists Amazon Associates US among supported affiliate partners — stay transparent.",
      "Avoid unsupported link shorteners; broken destinations get blocked.",
    ],
  },
  x: {
    platform: "x",
    maxChars: 280, // automation targets free/standard limit
    previewFold: 280,
    linksClickableInCaption: true,
    preferLinkField: false,
    maxUniqueLinks: 1,
    amazonStatementPlacement: "bio_required",
    notes: [
      "Standard posts: 280 weighted characters (Premium can go to 25k — we still target 280).",
      "Lead with a short hook; put the Special Link + #ad in the same post.",
      "Full Amazon Associate statement belongs in the X bio (Amazon: associated with account).",
      "Optional API paid_partnership flag labels paid promo — still keep #ad text.",
      "If the affiliate URL won’t fit, point to the bio link (Amazon UK guidance pattern).",
      "Register the full X profile URL in Associates Central.",
    ],
  },
};

export function getPlatformStyleNotes(platform: SocialPlatform): string[] {
  return PLATFORM_RULES[platform].notes;
}

export function getPlatformRules(platform: SocialPlatform): PlatformRules {
  return PLATFORM_RULES[platform];
}

/** Collapse whitespace. */
function cleanBody(raw: string, title: string): string {
  return (raw || title || "").replace(/\s+/g, " ").trim();
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, Math.max(0, max - 1));
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 40 ? slice.slice(0, cut) : slice).trimEnd()}…`;
}

/**
 * Fit prefix + body + suffix into maxChars.
 * Disclosure pieces in prefix/suffix are protected; body shrinks first.
 */
function compose(opts: {
  prefix: string;
  body: string;
  suffix: string;
  maxChars: number;
}): string {
  const { prefix, body, suffix, maxChars } = opts;
  const fixed = prefix.length + suffix.length;
  if (fixed >= maxChars) {
    return `${prefix}${suffix}`.slice(0, maxChars).trimEnd();
  }
  const room = maxChars - fixed;
  const mid = room <= 0 ? "" : truncateAtWord(body, room);
  return `${prefix}${mid}${suffix}`.trim();
}

/** Rough UTF-8 byte length — Threads emoji counting. */
export function utf8ByteLength(text: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  return unescape(encodeURIComponent(text)).length;
}

function fitUtf8(
  prefix: string,
  body: string,
  suffix: string,
  maxBytes: number
): string {
  let lo = 0;
  let hi = body.length;
  let best = compose({ prefix, body: "", suffix, maxChars: prefix.length + suffix.length + 8 });
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = compose({
      prefix,
      body: truncateAtWord(body, mid) || body.slice(0, mid),
      suffix,
      maxChars: 100_000,
    });
    if (utf8ByteLength(candidate) <= maxBytes) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // Final safety clip by popping code points if still over (rare)
  let out = best;
  while (utf8ByteLength(out) > maxBytes && out.length > 0) {
    out = out.slice(0, -1);
  }
  return out.trimEnd();
}

export function buildPlatformPost(
  platform: SocialPlatform,
  deal: ShareDealInput
): PlatformPost {
  const rules = PLATFORM_RULES[platform];
  const storeLine = marketplaceSocialLine(deal.marketplace);
  const body = cleanBody(
    deal.geminiText ? `${deal.geminiText}\n\n${storeLine}` : storeLine,
    `${deal.title}\n\n${storeLine}`
  );
  const link = deal.affiliateUrl.trim();
  const notes = rules.notes;

  const baseFlags = {
    paidPartnershipSuggested: platform === "facebook" || platform === "instagram",
    isAffiliateLink: true,
    maxUniqueLinks: rules.maxUniqueLinks,
  };

  switch (platform) {
    case "facebook": {
      // Structure so #ad + hook sit above the fold; link + OA after.
      const prefix = `${LINK_LEVEL}\n`;
      const suffix = `\n\n${link}\n${LINK_LEVEL_ALT} · ${AMAZON_STATEMENT}`;
      const caption = compose({
        prefix,
        body,
        suffix,
        maxChars: rules.maxChars,
      });
      return {
        platform,
        caption,
        charCount: caption.length,
        maxChars: rules.maxChars,
        countLabel: `${caption.length}/${rules.maxChars} (fold ~${rules.previewFold})`,
        linkUrl: link,
        linkAttachment: link,
        flags: baseFlags,
        notes,
        rules,
      };
    }

    case "threads": {
      // One URL only in text; OA statement omitted when it blows the 500 budget.
      const withStatement = `\n\n${link}\n${LINK_LEVEL_ALT} · ${AMAZON_STATEMENT}`;
      const withoutStatement = `\n\n${link}\n${LINK_LEVEL} ${LINK_LEVEL_ALT}`;
      const suffix =
        utf8ByteLength(`#ad ${body}${withStatement}`) > rules.maxChars
          ? withoutStatement
          : withStatement;
      const caption = fitUtf8(`${LINK_LEVEL} `, body, suffix, rules.maxChars);
      return {
        platform,
        caption,
        charCount: utf8ByteLength(caption),
        maxChars: rules.maxChars,
        countLabel: `${utf8ByteLength(caption)}/${rules.maxChars} UTF-8 bytes`,
        linkUrl: link,
        linkAttachment: link,
        bioHint: AMAZON_STATEMENT,
        flags: baseFlags,
        notes,
        rules,
      };
    }

    case "instagram": {
      // Instagram often blocks Amazon affiliate URLs — bio/link tool must use
      // the website deal page (or /go), never rely on amazon.com in the caption.
      const siteLink = (deal.goUrl || deal.dealUrl || link).trim();
      const prefix = `${LINK_LEVEL} Affiliate — I may earn from qualifying purchases.\n`;
      const suffix = `\n\nShop via link in bio (website).\n${AMAZON_STATEMENT}`;
      const caption = compose({
        prefix,
        body,
        suffix,
        maxChars: rules.maxChars,
      });
      const firstComment = `${deal.categoryName ? `#${deal.categoryName.replace(/\s+/g, "")} ` : ""}#AmazonFinds #OurDealsHub\n${LINK_LEVEL} ${LINK_LEVEL_ALT}`;
      return {
        platform,
        caption,
        charCount: caption.length,
        maxChars: rules.maxChars,
        countLabel: `${caption.length}/${rules.maxChars} (#ad in first ${rules.previewFold})`,
        linkUrl: siteLink,
        firstComment,
        bioHint: `Point bio (or link tool) at your site: ${siteLink}`,
        flags: baseFlags,
        notes,
        rules,
      };
    }

    case "telegram": {
      const caption = compose({
        prefix: `${LINK_LEVEL}\n`,
        body,
        suffix: `\n\n${link}\n\n${LINK_LEVEL_ALT} · ${AMAZON_STATEMENT}`,
        maxChars: rules.maxChars,
      });
      const mediaCaption = compose({
        prefix: `${LINK_LEVEL} `,
        body,
        suffix: `\n${link}\n${AMAZON_STATEMENT}`,
        maxChars: 1024,
      });
      return {
        platform,
        caption,
        charCount: caption.length,
        maxChars: rules.maxChars,
        countLabel: `${caption.length}/${rules.maxChars} (media caption ≤1024)`,
        linkUrl: link,
        mediaCaption,
        flags: baseFlags,
        notes,
        rules,
      };
    }

    case "pinterest": {
      const title = truncateAtWord(deal.title.trim() || body, 100);
      // Description carries disclosure; destination URL is the pin `link` field (not duplicated if short).
      const caption = compose({
        prefix: `${LINK_LEVEL} `,
        body,
        suffix: `\n${LINK_LEVEL_ALT} · ${AMAZON_STATEMENT}`,
        maxChars: rules.maxChars,
      });
      return {
        platform,
        caption,
        charCount: caption.length,
        maxChars: rules.maxChars,
        countLabel: `${caption.length}/${rules.maxChars} · title ≤100`,
        linkUrl: link,
        linkAttachment: link,
        title,
        flags: { ...baseFlags, isAffiliateLink: true },
        notes,
        rules,
      };
    }

    case "x": {
      // 280 target; OA statement → bio. Keep #ad adjacent to the Special Link.
      const suffix = `\n${link} ${LINK_LEVEL}`;
      const caption = compose({
        prefix: "",
        body,
        suffix,
        maxChars: rules.maxChars,
      });
      return {
        platform,
        caption,
        charCount: caption.length,
        maxChars: rules.maxChars,
        countLabel: `${caption.length}/${rules.maxChars}`,
        linkUrl: link,
        bioHint: AMAZON_STATEMENT,
        flags: { ...baseFlags, paidPartnershipSuggested: true },
        notes,
        rules,
      };
    }

    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

/** Back-compat — Facebook style caption. */
export function buildSocialCaption(deal: ShareDealInput): string {
  return buildPlatformPost("facebook", deal).caption;
}
