/**
 * Amazon Associates + FTC disclosure copy.
 * Per Associates Central (OA + Help):
 * 1) Site statement: “As an Amazon Associate I earn from qualifying purchases.”
 *    (or substantially similar)
 * 2) Link-level near each Special Link: clear + conspicuous — e.g. “(paid link)”,
 *    “#ad”, or “#CommissionsEarned”
 * (Not legal advice — follow current Associates Operating Agreement.)
 */

/** Operating Agreement–style site / account statement. */
export const AMAZON_ASSOCIATE_STATEMENT =
  "As an Amazon Associate, OurDealsHub earns from qualifying purchases.";

/**
 * Link-level disclosure — place immediately next to each Special Link / CTA
 * (Amazon Associates Help: clear & conspicuous).
 */
export const LINK_LEVEL_DISCLOSURE = "(paid link)";

/** Short helper under card / sticky CTAs. */
export const AFFILIATE_LINK_NOTE =
  "We may earn a commission at no extra cost to you.";

/** One-line site chrome (header/category bar). */
export const AFFILIATE_CHROME_LINE =
  "As an Amazon Associate, OurDealsHub earns from qualifying purchases.";

export const AMAZON_PROGRAM_BLURB =
  "OurDealsHub is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com and affiliated sites.";

/**
 * rel for every outbound Amazon (Special Link) anchor. Deliberately NOT
 * "noreferrer": Amazon must be able to see which site sent the click
 * (Participation Requirements §6(v): don't "cloak, hide, spoof, or otherwise
 * obscure the URL of your Site … including by use of Redirecting Links").
 */
export const AFFILIATE_LINK_REL = "sponsored nofollow noopener";

/** Required when showing text that came from Amazon's API (IP License §2(k)). */
export const AMAZON_CONTENT_NOTICE =
  "Certain content that appears on OurDealsHub comes from Amazon. This content is provided 'as is' and is subject to change or removal at any time.";
