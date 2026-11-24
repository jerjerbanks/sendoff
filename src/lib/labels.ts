import type { MemberStatus, Role, SplitType, TripStatus } from "./trip-math";

export function roleLabel(role: Role): string {
  if (role === "organizer") return "Organizer";
  if (role === "honoree") return "Guest of honor";
  return "Member";
}

export function statusLabel(status: MemberStatus): string {
  if (status === "invited") return "Invited";
  if (status === "joined") return "Joined, not committed";
  if (status === "committed") return "Committed";
  if (status === "declined") return "Declined";
  return "Dropped";
}

export function tripStatusLabel(status: TripStatus): string {
  if (status === "planning") return "Planning";
  if (status === "voting") return "Voting";
  if (status === "buy_in_open") return "Buy-in open";
  if (status === "booking_ready") return "Ready to book";
  if (status === "booked") return "Booked";
  if (status === "under_minimum") return "Under minimum";
  return "Cancelled";
}

export function pollKindLabel(kind: string): string {
  if (kind === "destination") return "Where";
  if (kind === "dates") return "When";
  return "What we'll do";
}

export function categoryLabel(category: string): string {
  if (category === "lodging") return "Lodging";
  if (category === "flight" || category === "flights") return "Flight";
  if (category === "tee_times") return "Tee times";
  if (category === "activities") return "Activities";
  if (category === "activity") return "Activity";
  if (category === "golf") return "Golf";
  if (category === "food") return "Food";
  return "Other";
}

export function splitLabel(split: SplitType): string {
  if (split === "shared") return "Shared";
  if (split === "individual") return "Individual";
  return "Optional";
}

export function paymentStatusLabel(status: string): string {
  if (status === "paid") return "Paid";
  if (status === "late") return "Late";
  if (status === "forfeited") return "Forfeited";
  if (status === "refunded") return "Refunded";
  return "Due";
}

export function ageBandLabel(band: string): string {
  if (band === "teen") return "Teen";
  if (band === "child") return "Child";
  if (band === "infant") return "Infant";
  return "Adult";
}

/** Spec 2.0.1 cutoffs, shown wherever a band is picked. */
export function ageBandHint(band: string): string {
  if (band === "teen") return "13–17";
  if (band === "child") return "2–12";
  if (band === "infant") return "under 2";
  return "18+";
}

export function splitModeLabel(mode: string): string {
  if (mode === "even_per_traveler") return "Even per traveler";
  if (mode === "even_per_party") return "Even per party";
  return "By room and bed";
}

export function splitModeHint(mode: string): string {
  if (mode === "even_per_traveler") return "Lodging splits equally among everyone with a paid bed. Co-sleepers and infants in a crib add nothing.";
  if (mode === "even_per_party") return "Each paying party owes the same lodging share, whatever room it takes or however many people it brings.";
  return "Nicer beds cost more. Each party pays for the beds it claims. A child in their own bed pays that bed like anyone else.";
}

export function honoreeRoleLabel(role: string | null): string {
  if (role === "bride") return "Bride";
  if (role === "groom") return "Groom";
  if (role === "birthday") return "Birthday";
  return "Guest of honor";
}

export function shareComfortLabel(value: string | null): string {
  if (value === "no_share") return "Prefers not to share a room with another party";
  if (value === "note_only") return "See note";
  return "Open to sharing";
}

export function bedLabel(bed: string | undefined): string {
  const value = (bed ?? "").toLowerCase();
  const names: Record<string, string> = {
    king: "King",
    queen: "Queen",
    full: "Full",
    twin: "Twin",
    bunk: "Bunk",
    sofa_bed: "Sofa bed",
    couch: "Couch",
    air_mattress: "Air mattress",
  };
  return names[value] ?? (value ? value[0]?.toUpperCase() + value.slice(1).replace(/_/g, " ") : "Bed");
}

export function partyStatusLabel(status: MemberStatus): string {
  if (status === "joined") return "Joined";
  return statusLabel(status);
}
