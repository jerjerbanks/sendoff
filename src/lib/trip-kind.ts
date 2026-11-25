import type { PreWeddingStyle, TripType } from "@/lib/store";

/** The occasions offered under "Adult". "none" is a plain adults trip. */
export const ADULT_OCCASIONS = [
  { value: "none", label: "Just a trip" },
  { value: "bachelor", label: "Bachelor party" },
  { value: "bachelorette", label: "Bachelorette party" },
  { value: "joint", label: "Joint bachelor + bachelorette" },
] as const;

export type TripKind = "adult" | "family";
export type Occasion = (typeof ADULT_OCCASIONS)[number]["value"];

/** Guests of honor only make sense for wedding occasions. */
export function isWeddingOccasion(kind: TripKind, occasion: string): boolean {
  return kind === "adult" && (occasion === "bachelor" || occasion === "bachelorette" || occasion === "joint");
}

/**
 * Maps the form's Adult/Family + occasion to what is stored. Wedding occasions keep the
 * existing `pre_wedding` type and style, so trips made before this change read the same.
 * Also accepts the old form fields (tripType=pre_wedding|family + preWeddingStyle) so a
 * page loaded before a deploy still submits correctly.
 */
export function parseTripKind(fields: {
  tripKind?: string;
  occasion?: string;
  tripType?: string;
  preWeddingStyle?: string;
}): { tripType: TripType; preWeddingStyle: PreWeddingStyle | null; allowsHonorees: boolean } {
  let kind: TripKind;
  let occasion: string;
  if (fields.tripKind) {
    kind = fields.tripKind === "family" ? "family" : "adult";
    occasion = fields.occasion ?? "none";
  } else if (fields.tripType === "family") {
    kind = "family";
    occasion = "none";
  } else if (fields.tripType === "pre_wedding") {
    kind = "adult";
    occasion = fields.preWeddingStyle === "bachelor" || fields.preWeddingStyle === "bachelorette" ? fields.preWeddingStyle : "joint";
  } else {
    kind = "adult";
    occasion = "none";
  }
  if (kind === "family") return { tripType: "family", preWeddingStyle: null, allowsHonorees: false };
  if (isWeddingOccasion(kind, occasion)) {
    return { tripType: "pre_wedding", preWeddingStyle: occasion as PreWeddingStyle, allowsHonorees: true };
  }
  return { tripType: "adult", preWeddingStyle: null, allowsHonorees: false };
}
