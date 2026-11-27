import type { PreWeddingStyle, TripType } from "@/lib/store";

/**
 * The occasion, offered only for Adult trips (a bachelor or bachelorette doesn't apply to a
 * family trip; tester feedback Nov 27). "none" means no special occasion.
 */
export const SUB_TYPES = [
  { value: "none", label: "No special occasion" },
  { value: "bachelor", label: "Bachelor party" },
  { value: "bachelorette", label: "Bachelorette party" },
  { value: "joint", label: "Joint bach party" },
] as const;

export type TripKind = "adult" | "family";
export type SubType = (typeof SUB_TYPES)[number]["value"];

function weddingStyle(value: string | undefined): PreWeddingStyle | null {
  return value === "bachelor" || value === "bachelorette" || value === "joint" ? value : null;
}

/** Guests of honor only make sense for the wedding sub-types, under either kind. */
export function isWeddingSubType(subType: string | undefined): boolean {
  return weddingStyle(subType) !== null;
}

/**
 * Maps the form's Adult/Family + sub-type to what is stored.
 * - Adult + wedding sub-type → `pre_wedding` + style (same as trips made before this change).
 * - Adult + none → `adult`.
 * - Family + anything → `family` with no occasion. The form no longer offers one for Family;
 *   a stale page that still posts one is ignored. Trips saved earlier keep theirs.
 * Also accepts the old form fields (tripType=pre_wedding|family + preWeddingStyle) so a
 * page loaded before a deploy still submits correctly.
 */
export function parseTripKind(fields: {
  tripKind?: string;
  subType?: string;
  tripType?: string;
  preWeddingStyle?: string;
}): { tripType: TripType; preWeddingStyle: PreWeddingStyle | null; allowsHonorees: boolean } {
  let kind: TripKind;
  let style: PreWeddingStyle | null;
  if (fields.tripKind) {
    kind = fields.tripKind === "family" ? "family" : "adult";
    style = weddingStyle(fields.subType);
  } else if (fields.tripType === "family") {
    kind = "family";
    style = null;
  } else if (fields.tripType === "pre_wedding") {
    kind = "adult";
    style = weddingStyle(fields.preWeddingStyle) ?? "joint";
  } else {
    kind = "adult";
    style = null;
  }
  if (kind === "family") return { tripType: "family", preWeddingStyle: null, allowsHonorees: false };
  if (style) return { tripType: "pre_wedding", preWeddingStyle: style, allowsHonorees: true };
  return { tripType: "adult", preWeddingStyle: null, allowsHonorees: false };
}
