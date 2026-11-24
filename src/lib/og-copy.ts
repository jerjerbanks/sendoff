import { formatDay } from "./format";

function wholeDollars(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString("en-US")}`;
}
import type { TripView } from "./view";

export interface OgCard {
  eyebrow: string;
  title: string;
  line: string;
  foot: string;
  alt: string;
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
  | "sensitivityRows"
  | "currentShareCents"
  | "guestName"
  | "tripType"
  | "preWeddingStyle"
  | "travelerCount"
>): OgCard {
  const destination = view.polls.find((poll) => poll.kind === "destination");
  const leader = destination?.options.slice().sort((a, b) => b.votes - a.votes)[0];
  const place = destination?.lockedLabel ?? leader?.label ?? view.name;
  const at = Math.max(view.minHeadcount, view.payerCount);
  const forecast = view.sensitivityRows.find((row) => row.payers === at)?.totalCents ?? view.currentShareCents;
  const amount = forecast != null ? `~${wholeDollars(forecast)} per party` : "share still open";
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
  const line = `${view.payerCount} of ${view.minHeadcount} parties in · ${view.travelerCount} going · ${amount}`;
  return {
    eyebrow: "SENDOFF",
    title,
    line,
    foot: when,
    alt: `${title} · ${line} · ${when}`,
  };
}
