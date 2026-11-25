import type { CellState } from "@/components/motion";
import type { TripView } from "./view";

/**
 * One headcount cell per paying party, at least as many as the minimum to book.
 * Committed parties fill first (lake, or pine once booked), then the viewer's own
 * undecided party (clay), then open cells.
 */
export function meterCells(view: TripView, options: { youPending?: boolean } = {}): CellState[] {
  const payers = view.parties.filter((party) => !party.isHonoreeOnly && party.status !== "off_trip" && party.status !== "declined");
  const mine = view.viewerParty?.payerUserId ?? null;
  const booked = view.lockedIn || view.status === "booked";
  const committed = payers.filter((party) => party.status === "committed" && !(options.youPending && party.payerUserId === mine)).length;
  const youPending =
    options.youPending ||
    (!!mine && payers.some((party) => party.payerUserId === mine && party.status !== "committed") && !!view.viewer?.isPayer);
  const total = Math.max(payers.length, view.minPayerCount, committed + (youPending ? 1 : 0));
  const cells: CellState[] = [];
  for (let i = 0; i < committed; i += 1) cells.push(booked && !options.youPending ? "booked" : "in");
  if (youPending) cells.push("you");
  while (cells.length < total) cells.push("open");
  return cells;
}
