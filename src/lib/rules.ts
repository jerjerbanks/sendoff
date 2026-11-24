/**
 * Defaults for questions the spec left open. Flip these in one place.
 * 1. Block a new buy-in when every sleep spot is already claimed.
 * 2. When the booked lodging total differs from the estimate, rebase shares immediately.
 * 3. Before the stay is booked, a member may move onto any unclaimed spot.
 *    Swapping two claimed spots still requires the organizer.
 */
export const RULES = {
  blockBuyInWhenNoUnclaimedSpot: true,
  rebaseSharesWhenActualLodgingChanges: true,
  membersMayMoveToUnclaimedBeforeBooked: true,
  memberToMemberSwapsRequireOrganizer: true,
} as const;
