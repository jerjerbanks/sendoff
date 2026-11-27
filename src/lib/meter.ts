import type { CellState } from "@/components/motion";
import type { TripView } from "./view";

/**
 * The headcount meter's numbers, capped at the minimum. Booking is triggered by
 * PAYING PARTIES (Spec 2.0 minPayers), so `committed` and `need` count parties.
 *
 * - Below the minimum: "committed / need", plus how many more are needed.
 * - At or past it: the met state. No denominator and no "needed" copy, so the
 *   meter can never read "4/3", "0 needed" or a negative count.
 */
export interface MeterState {
  committed: number;
  need: number;
  /** The fraction's numerator below the minimum: min(committed, need). */
  shown: number;
  met: boolean;
  /** max(0, need - committed); only shown while above 0. */
  remaining: number;
}

export function meterState(committed: number, need: number): MeterState {
  const c = Math.max(0, Math.floor(committed));
  const n = Math.max(1, Math.floor(need));
  return { committed: c, need: n, shown: Math.min(c, n), met: c >= n, remaining: Math.max(0, n - c) };
}

/** The line under the meter's label. `extra` is appended, e.g. "10 people". */
export function meterSub(state: MeterState, unit: string, extra?: string): string {
  const head = state.met ? `${state.committed} ${unit} committed · minimum ${state.need}` : `${state.remaining} more to book · minimum ${state.need}`;
  return extra ? `${head} · ${extra}` : head;
}

/**
 * The line about when the rest of a committed party's share is charged. "Scheduled
 * once N parties commit" only makes sense while the trip is under its minimum.
 */
export function restScheduleNote(args: {
  lockedIn: boolean;
  payerCount: number;
  minPayers: number;
  organizerFirstName: string;
  viewerIsOrganizer?: boolean;
}): string {
  if (args.lockedIn) return "Each party pays its own share, so nobody fronts the bill.";
  if (args.payerCount < args.minPayers) return `The rest of your share is scheduled once ${args.minPayers} parties commit.`;
  return `The minimum is met. The rest of your share is scheduled when ${args.viewerIsOrganizer ? "you book" : `${args.organizerFirstName} books`} the stay.`;
}

/**
 * The cells, in order: committed parties (lake, or pine once the minimum is met
 * or the stay is booked), then the viewer's own undecided party (accent), then open
 * cells up to `total`. Extra commitments past the minimum fill cells beyond the
 * threshold line.
 */
export function buildCells(args: { committed: number; need: number; total: number; youPending: boolean; booked: boolean }): CellState[] {
  const state = meterState(args.committed, args.need);
  const pine = args.booked || state.met;
  const cells: CellState[] = [];
  for (let i = 0; i < state.committed; i += 1) cells.push(pine ? "booked" : "in");
  if (args.youPending) cells.push("you");
  const total = Math.max(args.total, state.need, cells.length);
  while (cells.length < total) cells.push("open");
  return cells;
}

/** One headcount cell per paying party, at least as many as the minimum to book. */
export function meterCells(view: TripView, options: { youPending?: boolean } = {}): CellState[] {
  const payers = view.parties.filter((party) => !party.isHonoreeOnly && party.status !== "off_trip" && party.status !== "declined");
  const mine = view.viewerParty?.payerUserId ?? null;
  const committed = payers.filter((party) => party.status === "committed" && !(options.youPending && party.payerUserId === mine)).length;
  const youPending =
    !!options.youPending ||
    (!!mine && payers.some((party) => party.payerUserId === mine && party.status !== "committed") && !!view.viewer?.isPayer);
  // During the commit moment the meter animates the viewer's cell in, so the
  // other cells start lake and turn pine on their own.
  const booked = !options.youPending && (view.lockedIn || view.status === "booked");
  return buildCells({
    committed,
    need: view.minPayerCount,
    total: payers.length,
    youPending,
    booked: booked,
  }).map((cell) => (options.youPending && cell === "booked" ? "in" : cell));
}

/** The meter numbers for a trip view. */
export function tripMeter(view: TripView): MeterState {
  return meterState(view.payerCount, view.minPayerCount);
}
