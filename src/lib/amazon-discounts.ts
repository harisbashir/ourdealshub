/** Savings are copied from Amazon's featured offer, never inferred from prices. */
export type AmazonDiscount = { percent: number; basis: string; fetchedAt: Date; expiresAt: Date };
type Listing = {
  isBuyBoxWinner?: boolean; violatesMAP?: boolean; type?: string;
  condition?: { value?: string }; availability?: { type?: string };
  dealDetails?: { accessType?: string; startTime?: string; endTime?: string };
  price?: { savings?: { percentage?: number }; savingBasis?: { savingBasisType?: string; savingBasisTypeLabel?: string } };
};
export function parseAmazonDiscount(item: Record<string, unknown>, now = new Date()): AmazonDiscount | null {
  const offers = item.offersV2 as { listings?: Listing[] } | undefined;
  const listing = offers?.listings?.find((offer) => offer.isBuyBoxWinner === true);
  if (!listing || listing.violatesMAP !== false || listing.condition?.value !== "New") return null;
  if (!["IN_STOCK", "INSTOCK", "INSTOCKSCARCE"].includes(listing.availability?.type || "")) return null;
  if (listing.type && !["LIGHTNING_DEAL", "LIGHTNINGDEAL"].includes(listing.type)) return null;
  const deal = listing.dealDetails;
  if (deal?.accessType && deal.accessType !== "ALL") return null;
  if (deal?.startTime && (!Number.isFinite(Date.parse(deal.startTime)) || Date.parse(deal.startTime) > now.getTime())) return null;
  const percent = listing.price?.savings?.percentage;
  const basis = listing.price?.savingBasis?.savingBasisTypeLabel?.trim();
  if (typeof percent !== "number" || !Number.isInteger(percent) || percent < 1 || percent > 99 || !basis) return null;
  const end = deal?.endTime ? Date.parse(deal.endTime) : Infinity;
  const expiresAt = new Date(Math.min(now.getTime() + 24 * 60 * 60_000, end));
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) return null;
  return { percent, basis: basis.slice(0, 100), fetchedAt: now, expiresAt };
}
export function discountFields(discount: AmazonDiscount | null) {
  return { discountPercent: discount?.percent ?? null, discountBasis: discount?.basis ?? null,
    discountFetchedAt: discount?.fetchedAt ?? null, discountExpiresAt: discount?.expiresAt ?? null };
}

export type DiscountData = { discountPercent?: number | null; discountBasis?: string | null; discountFetchedAt?: Date | string | null; discountExpiresAt?: Date | string | null };
export function visibleDiscount(data: DiscountData, now = Date.now()) {
  const percent = data.discountPercent;
  const fetched = data.discountFetchedAt ? new Date(data.discountFetchedAt).getTime() : NaN;
  const expires = data.discountExpiresAt ? new Date(data.discountExpiresAt).getTime() : NaN;
  return typeof percent === "number" && Number.isInteger(percent) && percent > 0 && percent < 100 &&
    Boolean(data.discountBasis) && fetched <= now && now - fetched < 86400_000 && expires > now ? percent : null;
}

/** Original preview illustrations have explicitly fictional savings examples. */
export function sampleSavings(slug: string): number | null {
  const kind = /^sample-(us|uk|ca)-(charger|headphones|bottle|lamp)$/.exec(slug)?.[2];
  return kind ? ({ charger: 25, headphones: 30, bottle: 20, lamp: 15 } as Record<string, number>)[kind] : null;
}
