import type { TripView } from "./view";

/**
 * The "if the group changes" stops for the viewer's party. Today's count shows today's
 * real bill, the same number as Book and Pay; the other stops are forecasts. Below the
 * minimum, today's unofficial share is the starting point.
 */
export function forecastFor(view: TripView) {
  const party = view.viewerParty;
  if (!party || view.lockedIn || view.sensitivityRows.length === 0) return null;
  const rows = [...view.sensitivityRows];
  const committed = party.status === "committed";
  if (committed && view.currentShareCents != null) {
    const today = rows.findIndex((row) => row.payers === view.payerCount);
    const row = { payers: view.payerCount, totalCents: view.currentShareCents, expanded: false };
    if (today >= 0) rows[today] = row;
    else rows.unshift(row);
  }
  if (rows.length < 2) return null;
  const wanted = committed ? view.payerCount : Math.max(view.minPayerCount, view.payerCount + 1);
  const start = rows.some((row) => row.payers === wanted) ? wanted : (rows[0]?.payers ?? wanted);
  const band = view.shareLowCents != null && view.shareHighCents != null && view.currentShareCents != null;
  return {
    rows,
    start,
    bandLow: band ? view.shareLowCents! - view.currentShareCents! : null,
    bandHigh: band ? view.shareHighCents! - view.currentShareCents! : null,
  };
}
