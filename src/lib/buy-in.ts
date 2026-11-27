/**
 * A starting point for the buy-in: a quarter of an even lodging share at the minimum, to the
 * nearest $10. The buy-in is part of each party's share, so it has to sit well under it.
 * (It used to suggest the whole lodging total per party.) The organizer can type any amount.
 */
export function suggestedBuyIn(lodgingTotalCents: number, minPayers: number): number {
  if (lodgingTotalCents <= 0) return 0;
  const quarterShare = lodgingTotalCents / Math.max(1, minPayers) / 4;
  return Math.max(1_000, Math.round(quarterShare / 1_000) * 1_000);
}
