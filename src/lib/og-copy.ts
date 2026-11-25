import { formatDay } from "./format";

function wholeDollars(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString("en-US")}`;
}
import type { TripView } from "./view";
import { APP_NAME } from "./constants";

export interface OgCard {
  eyebrow: string;
  title: string;
  line: string;
  foot: string;
  /** Image alt text and description: the facts, no brand. */
  alt: string;
  /** Browser tab: the facts first, then the app. */
  pageTitle: string;
  /** Link-preview headline (og:title, twitter:title): the app, then the trip. */
  shareTitle: string;
}

/** Public card copy. No private budgets. */
export function ogCard(view: Pick<
  TripView,
  | "name"
  | "payerCount"
  | "maxHeadcount"
  | "minHeadcount"
  | "buyInDeadline"
  | "polls"
  | "parties"
  | "guestName"
  | "tripType"
  | "preWeddingStyle"
  | "travelerCount"
>): OgCard {
  const destination = view.polls.find((poll) => poll.kind === "destination");
  const leader = destination?.options.slice().sort((a, b) => b.votes - a.votes)[0];
  const place = destination?.lockedLabel ?? leader?.label ?? view.name;
  // A card anyone in the chat sees: the honest spread across committed parties, never one party's number.
  const shares = view.parties
    .filter((party) => party.status === "committed" && party.bill?.payer)
    .map((party) => party.bill?.totalCents ?? 0);
  const low = shares.length ? Math.min(...shares) : null;
  const high = shares.length ? Math.max(...shares) : null;
  const amount =
    low == null || high == null
      ? "share still open"
      : low === high
        ? `~${wholeDollars(low)} per party`
        : `${wholeDollars(low)}–${wholeDollars(high)} per party`;
  const when = view.buyInDeadline ? `commit by ${formatDay(view.buyInDeadline)}` : "commit date not set";
  const kind =
    view.tripType === "family"
      ? "family trip"
      : view.preWeddingStyle === "bachelor"
        ? "bachelor"
        : view.preWeddingStyle === "bachelorette"
          ? "bachelorette"
          : "weekend";
  const title = `${place.split(",")[0]} ${kind}`;
  const inLine =
    view.payerCount < view.minHeadcount
      ? `${view.payerCount} of ${view.minHeadcount} parties in`
      : `${view.payerCount} ${view.payerCount === 1 ? "party" : "parties"} in`;
  // Money first: if the card has to drop a segment to fit, it drops the least important one.
  const line = `${amount} · ${inLine} · ${view.travelerCount} going`;
  return {
    eyebrow: APP_NAME.toUpperCase(),
    title,
    line,
    foot: when,
    alt: `${title} · ${line} · ${when}`,
    pageTitle: `${title} · ${line} · ${when} · ${APP_NAME}`,
    shareTitle: `${APP_NAME} · ${title}`,
  };
}
