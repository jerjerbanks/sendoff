import type { MemberStatus, Role, SplitType, TripStatus } from "./trip-math";

export function roleLabel(role: Role): string {
  if (role === "organizer") return "Organizer";
  if (role === "honoree") return "Guest of honor";
  return "Member";
}

export function statusLabel(status: MemberStatus): string {
  if (status === "invited") return "Invited";
  if (status === "joined") return "Not committed";
  if (status === "committed") return "Committed";
  return "Off the trip";
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
  if (category === "flight") return "Flight";
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
