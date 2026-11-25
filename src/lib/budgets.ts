import { roundUpDollarCents } from "./trip-math";

export type FitBadge = "fits_everyone" | "fits_most" | "over_budget" | "none";

/** One paying party in the badge set. `userId` is the party's payer. */
export interface BudgetPerson {
  userId: string;
  /**
   * This party's age-weighted share of the per-head pool at N_ref.
   * Omitted means a party of one adult: pool / N_ref, as in v1.3.
   */
  evenShareCents?: number;
  /** Null when this person skipped a budget. They are left out of the badge. */
  budgetCents: number | null;
  /** Null when this option has no high fare for them. They are left out. */
  highFlightCents: number | null;
}

export interface FitResult {
  badge: FitBadge;
  /** How many people were in the badge set. Not an over-count. */
  budgetCount: number;
  /** "based on N budgets" only when N is at least 4. Never names anyone. */
  countLabel: string | null;
  label: string | null;
}

/** Odd-length lists use the middle value. The seed's seven payer weights median to 0.8. */
export function medianWeight(weights: number[]): number {
  if (weights.length === 0) return 0;
  const sorted = [...weights].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Conservative all-in: median bed, min headcount, high fare, no optional items. */
export function feasibilityCents(args: {
  lodgingCents: number;
  evenPoolCents: number;
  headcount: number;
  weightSum: number;
  weight: number;
  flightCents: number;
  evenShareCents?: number;
}): number {
  if (args.headcount <= 0 || args.weightSum <= 0) return roundUpDollarCents(args.flightCents);
  const lodging = (args.lodgingCents * args.weight) / args.weightSum;
  const even = args.evenShareCents ?? args.evenPoolCents / args.headcount;
  return roundUpDollarCents(lodging + even + args.flightCents);
}

export function fitForOption(args: {
  lodgingCents: number;
  evenPoolCents: number;
  headcount: number;
  weightSum: number;
  medianWeight: number;
  people: BudgetPerson[];
}): FitResult {
  const included = args.people.filter((person) => person.budgetCents != null && person.highFlightCents != null);
  if (included.length === 0) return { badge: "none", budgetCount: 0, countLabel: null, label: null };
  let fits = 0;
  for (const person of included) {
    const allIn = feasibilityCents({
      lodgingCents: args.lodgingCents,
      evenPoolCents: args.evenPoolCents,
      headcount: args.headcount,
      weightSum: args.weightSum,
      weight: args.medianWeight,
      flightCents: person.highFlightCents ?? 0,
      evenShareCents: person.evenShareCents,
    });
    if (allIn <= (person.budgetCents ?? 0)) fits += 1;
  }
  const badge: FitBadge =
    fits === included.length ? "fits_everyone" : fits >= args.headcount ? "fits_most" : "over_budget";
  const label =
    badge === "fits_everyone" ? "Fits everyone" : badge === "fits_most" ? "Fits most" : "Over budget for the group";
  return {
    badge,
    budgetCount: included.length,
    countLabel: included.length >= 4 ? `based on ${included.length} budgets` : null,
    label,
  };
}

/** A cheaper place to sleep, for the private suggestion line. */
export interface BedOption {
  label: string;
  weight: number;
  ownRoom: boolean;
}

/** v1.3 suggestions for a party of one: the couch and a shared queen. */
export const SOLO_BED_OPTIONS: BedOption[] = [
  { label: "couch", weight: 0.5, ownRoom: false },
  { label: "shared queen", weight: 0.625, ownRoom: false },
];

export interface BedHint {
  label: string;
  underByCents: number;
  conflictsWithOwnRoom: boolean;
}

export interface PrivateFit {
  allInCents: number;
  deltaCents: number;
  direction: "over" | "under";
  hints: BedHint[];
}

export function privateFit(args: {
  lodgingCents: number;
  evenPoolCents: number;
  headcount: number;
  weightSum: number;
  medianWeight: number;
  flightCents: number;
  budgetCents: number;
  wantsOwnRoom: boolean;
  evenShareCents?: number;
  /** Cheaper places that can house this party. Defaults to the solo couch / shared queen. */
  bedOptions?: BedOption[];
}): PrivateFit {
  const base = {
    lodgingCents: args.lodgingCents,
    evenPoolCents: args.evenPoolCents,
    headcount: args.headcount,
    weightSum: args.weightSum,
    evenShareCents: args.evenShareCents,
  };
  const allIn = feasibilityCents({ ...base, weight: args.medianWeight, flightCents: args.flightCents });
  const hints: BedHint[] = [];
  if (allIn > args.budgetCents) {
    for (const bed of args.bedOptions ?? SOLO_BED_OPTIONS) {
      const cost = feasibilityCents({ ...base, weight: bed.weight, flightCents: args.flightCents });
      if (cost <= args.budgetCents) {
        hints.push({
          label: bed.label,
          underByCents: args.budgetCents - cost,
          conflictsWithOwnRoom: args.wantsOwnRoom && !bed.ownRoom,
        });
      }
    }
  }
  return {
    allInCents: allIn,
    deltaCents: Math.abs(args.budgetCents - allIn),
    direction: allIn > args.budgetCents ? "over" : "under",
    hints,
  };
}

/** What one member is allowed to receive. Other people's budgets never appear. */
export interface PublicOption {
  id: string;
  label: string;
  badge: string | null;
  countLabel: string | null;
  hidden: boolean;
}

export interface OwnBudget {
  maxAllInCents: number;
  flexNote: string | null;
  mustHaves: string[];
}

export interface MemberPayload {
  viewerId: string;
  options: PublicOption[];
  /** Only the viewer's budget. Null when they skipped. */
  budget: OwnBudget | null;
  /** Only the viewer's over/under lines, keyed by option id. */
  privateLines: Record<string, string>;
}

export function memberPayload(args: {
  viewerId: string;
  options: PublicOption[];
  budgets: { userId: string; maxAllInCents: number; flexNote: string | null; mustHaves: string[] }[];
  privateLines: Record<string, string>;
}): MemberPayload {
  const own = args.budgets.find((budget) => budget.userId === args.viewerId) ?? null;
  return {
    viewerId: args.viewerId,
    options: args.options.map((option) => ({
      id: option.id,
      label: option.label,
      badge: option.badge,
      countLabel: option.countLabel,
      hidden: option.hidden,
    })),
    budget: own
      ? { maxAllInCents: own.maxAllInCents, flexNote: own.flexNote, mustHaves: [...own.mustHaves] }
      : null,
    privateLines: { ...args.privateLines },
  };
}
