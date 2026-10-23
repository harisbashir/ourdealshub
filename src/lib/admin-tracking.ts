import { prisma } from "@/lib/prisma";
import { normalizeTrackingId } from "@/lib/tracking";
import { getEnvPartnerTagFallback } from "@/lib/amazon";
import {
  parseMarketplace,
  type MarketplaceCode,
} from "@/lib/marketplace";

export const MISSING_TRACKING_ID_MESSAGE =
  "Your Amazon Tracking ID has not been configured. Please contact the Super Admin.";

export const MISSING_UK_TRACKING_ID_MESSAGE =
  "Your UK Amazon Tracking ID has not been configured. Add it under Admins → Edit.";

/**
 * Load the admin's Associates tracking ID for a marketplace.
 * Never accept a tracking ID from the client/request body.
 */
export async function getAdminTrackingId(
  adminId: string,
  marketplace: MarketplaceCode | string = "US"
): Promise<string | null> {
  const market = parseMarketplace(marketplace);
  const row = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      amazonTrackingId: true,
      amazonTrackingIdUk: true,
      role: true,
    },
  });

  if (market === "UK") {
    return normalizeTrackingId(row?.amazonTrackingIdUk);
  }

  const fromDb = normalizeTrackingId(row?.amazonTrackingId);
  if (fromDb) return fromDb;

  if (row?.role === "SUPER_ADMIN") {
    return normalizeTrackingId(getEnvPartnerTagFallback());
  }
  return null;
}

export async function requireAdminTrackingId(
  adminId: string,
  marketplace: MarketplaceCode | string = "US"
): Promise<string> {
  const market = parseMarketplace(marketplace);
  const tag = await getAdminTrackingId(adminId, market);
  if (!tag) {
    throw new Error(
      market === "UK"
        ? MISSING_UK_TRACKING_ID_MESSAGE
        : MISSING_TRACKING_ID_MESSAGE
    );
  }
  return tag;
}

/**
 * Tracking ID to use when updating an existing deal.
 * Prefer the deal owner's Associates tag so a Super Admin edit never moves
 * the commission to the editor.
 */
export async function trackingIdForProductUpdate(
  admin: { id: string },
  product: {
    createdById: string | null;
    trackingId: string | null;
    marketplace?: string | null;
  }
): Promise<string> {
  const market = product.marketplace || "US";
  if (product.createdById) {
    const ownerTag = await getAdminTrackingId(product.createdById, market);
    if (ownerTag) return ownerTag;
  }
  const stored = normalizeTrackingId(product.trackingId);
  if (stored) return stored;
  const self = await getAdminTrackingId(admin.id, market);
  if (!self) throw new Error(MISSING_TRACKING_ID_MESSAGE);
  return self;
}
