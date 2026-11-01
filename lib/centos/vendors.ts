/**
 * CentenarianOS vendors, read over the signed API (contract E1 to E3, centenarian-os
 * docs/integrations/ridewitus-contract.md; PRD §5.11, §6.9). Read-only by owner decision (PRD Q14):
 * RideWitUS never creates a vendor; it links to `create_vendor_url` in CentenarianOS instead, and
 * stores only `vendor_refs` (the CentenarianOS contact id plus an optional location id). Nothing
 * here is cached: every screen reads the current answer.
 *
 * Shapes are checked on arrival. A response that does not match is `invalid_response`, not a crash.
 */
import { z } from "zod";
import { centosGet, type CentosCallOptions, type CentosResult } from "./client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const locationSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string().nullable(),
  is_default: z.boolean(),
});

const priceSchema = z.object({
  item_name: z.string(),
  price: z.number(),
  unit: z.string().nullable(),
  unit_price: z.number().nullable(),
  recorded_date: z.string(),
  source: z.string().nullable(),
});

const vendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  company_name: z.string().nullable(),
  category: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  locations: z.array(locationSchema),
  created_at: z.string().nullable(),
  recent_prices: z.array(priceSchema).optional(),
});

const listSchema = z.object({
  vendors: z.array(vendorSchema),
  next_offset: z.number().nullable(),
  currency: z.string().nullable(),
  create_vendor_url: z.string(),
});

const oneSchema = z.object({ vendor: vendorSchema, currency: z.string().nullable() });

const pricesSchema = z.object({
  vendor_id: z.string(),
  since: z.string(),
  prices: z.array(priceSchema),
  currency: z.string().nullable(),
});

export type CentosVendor = z.infer<typeof vendorSchema>;
export type CentosVendorLocation = z.infer<typeof locationSchema>;
export type CentosPrice = z.infer<typeof priceSchema>;
export type CentosVendorPage = z.infer<typeof listSchema>;
export type CentosVendorPrices = z.infer<typeof pricesSchema>;

const parseWith =
  <T>(schema: z.ZodType<T>) =>
  (data: unknown): T | null => {
    const parsed = schema.safeParse(data);
    return parsed.success ? parsed.data : null;
  };

/** Picker page size; CentenarianOS allows 1 to 200 (default 50). */
export const VENDOR_SEARCH_LIMIT = 20;
export const MAX_QUERY_LENGTH = 100;

export function isCentosId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** E1: the user's vendors whose name contains `q` (case-insensitive). */
export function searchCentosVendors(
  witusSub: string,
  query: { q?: string | null; limit?: number; offset?: number },
  options?: CentosCallOptions
): Promise<CentosResult<CentosVendorPage>> {
  const q = query.q?.trim().slice(0, MAX_QUERY_LENGTH) || null;
  return centosGet(
    "vendors",
    "/api/v1/ride/vendors",
    { witus_sub: witusSub, q, limit: query.limit ?? VENDOR_SEARCH_LIMIT, offset: query.offset || null },
    parseWith(listSchema),
    options
  );
}

/** E2: one vendor. A malformed id never leaves RideWitUS: it is `not_found` here. */
export async function getCentosVendor(
  witusSub: string,
  vendorId: string,
  options?: CentosCallOptions
): Promise<CentosResult<{ vendor: CentosVendor; currency: string | null }>> {
  if (!isCentosId(vendorId)) return { ok: false, problem: "not_found", status: 0 };
  return centosGet("vendors", `/api/v1/ride/vendors/${vendorId}`, { witus_sub: witusSub }, parseWith(oneSchema), options);
}

/** E3: recent prices at one vendor, newest first. `since` defaults to 180 days ago on CentenarianOS. */
export async function getCentosVendorPrices(
  witusSub: string,
  vendorId: string,
  query: { since?: string | null; limit?: number } = {},
  options?: CentosCallOptions
): Promise<CentosResult<CentosVendorPrices>> {
  if (!isCentosId(vendorId)) return { ok: false, problem: "not_found", status: 0 };
  return centosGet(
    "vendors",
    `/api/v1/ride/vendors/${vendorId}/prices`,
    { witus_sub: witusSub, since: query.since ?? null, limit: query.limit ?? 50 },
    parseWith(pricesSchema),
    options
  );
}

/** "Shell on Main · Main St" for a vendor, or one of its locations. */
export function vendorLabel(vendor: Pick<CentosVendor, "name" | "locations">, locationId: string | null): string {
  const location = locationId ? vendor.locations.find((l) => l.id === locationId) : undefined;
  return location ? `${vendor.name} · ${location.label}` : vendor.name;
}

/** One pickable row per vendor, plus one per location when a vendor has more than one. */
export interface VendorChoice {
  contactId: string;
  locationId: string | null;
  label: string;
  detail: string | null;
}

export function vendorChoices(vendors: readonly CentosVendor[]): VendorChoice[] {
  const out: VendorChoice[] = [];
  for (const v of vendors) {
    const detail = [v.category, v.city].filter(Boolean).join(" · ") || null;
    if (v.locations.length <= 1) {
      const only = v.locations[0];
      out.push({ contactId: v.id, locationId: only?.id ?? null, label: vendorLabel(v, only?.id ?? null), detail: only?.address ?? detail });
      continue;
    }
    for (const l of v.locations) out.push({ contactId: v.id, locationId: l.id, label: vendorLabel(v, l.id), detail: l.address ?? detail });
  }
  return out;
}

/**
 * A price as text. CentenarianOS stores no currency on prices yet (`currency: null`), so no symbol
 * is guessed: the number is shown as recorded, and the screen says the currency is not recorded.
 */
export function priceText(p: Pick<CentosPrice, "price" | "unit" | "unit_price">, currency: string | null): string {
  const amount = (n: number) => (currency ? `${n.toFixed(2)} ${currency}` : n.toFixed(2));
  const base = amount(p.price);
  if (p.unit && p.unit_price != null) return `${base} (${amount(p.unit_price)} per ${p.unit})`;
  return p.unit ? `${base} per ${p.unit}` : base;
}
