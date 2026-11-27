import { writeFileSync } from "node:fs";
import {
  demoCosts,
  demoMembers,
  demoMilestones,
  demoOptions,
  demoPayments,
  demoPolls,
  demoBudgets,
  demoClaims,
  demoParticipants,
  demoSpots,
  demoTrip,
  demoUsers,
  demoVotes,
} from "../src/lib/demo-data";

function sql(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

const lines: string[] = [
  "-- Idempotent demo seed for the Scottsdale Golf Weekend. The app also seeds itself on /demo.",
  "-- Run after migrations: wrangler d1 execute sendoff --local|--remote --file=./seed/demo.sql",
  "",
];

for (const user of demoUsers) {
  lines.push(
    `INSERT OR IGNORE INTO users (id, name, contact) VALUES (${sql(user.id)}, ${sql(user.name)}, ${sql(user.contact)});`,
  );
}

lines.push(
  `INSERT OR IGNORE INTO trips (id, name, trip_type, organizer_id, guest_of_honor_user_id, date_window, status, buy_in_amount, buy_in_deadline, min_headcount, max_headcount, bed_change_policy, honoree_excluded_from_split, invite_token, simulated_now, theme) VALUES (${sql(demoTrip.id)}, ${sql(demoTrip.name)}, ${sql(demoTrip.tripType)}, ${sql(demoTrip.organizerId)}, ${sql(demoTrip.guestOfHonorUserId)}, ${sql(demoTrip.dateWindow)}, ${sql(demoTrip.status)}, ${sql(demoTrip.buyInAmount)}, ${sql(demoTrip.buyInDeadline)}, ${sql(demoTrip.minHeadcount)}, ${sql(demoTrip.maxHeadcount)}, ${sql(demoTrip.bedChangePolicy)}, ${sql(demoTrip.honoreeExcludedFromSplit)}, ${sql(demoTrip.inviteToken)}, NULL, ${sql(demoTrip.theme)});`,
);

for (const member of demoMembers) {
  lines.push(
    `INSERT OR IGNORE INTO trip_members (trip_id, user_id, role, status, committed_at) VALUES (${sql(demoTrip.id)}, ${sql(member.userId)}, ${sql(member.role)}, ${sql(member.status)}, ${sql(member.committedAt)});`,
  );
}

for (const poll of demoPolls) {
  lines.push(
    `INSERT OR IGNORE INTO polls (id, trip_id, kind, deadline, locked_option_id) VALUES (${sql(poll.id)}, ${sql(demoTrip.id)}, ${sql(poll.kind)}, ${sql(poll.deadline)}, ${sql(poll.lockedOptionId)});`,
  );
}

for (const option of demoOptions) {
  lines.push(
    `INSERT OR IGNORE INTO poll_options (id, poll_id, label, est_cost, link, sort_order, lodging_estimate, hidden_by_organizer, per_person_cents) VALUES (${sql(option.id)}, ${sql(option.pollId)}, ${sql(option.label)}, ${sql(option.estCost)}, ${sql(option.link)}, ${sql(option.sortOrder)}, ${sql(option.lodgingEstimate)}, ${sql(option.hiddenByOrganizer)}, ${sql(option.perPersonCents)});`,
  );
}

for (const vote of demoVotes) {
  lines.push(
    `INSERT OR IGNORE INTO votes (poll_option_id, user_id) VALUES (${sql(vote.optionId)}, ${sql(vote.userId)});`,
  );
}

for (const cost of demoCosts) {
  lines.push(
    `INSERT OR IGNORE INTO cost_items (id, trip_id, label, category, split_type, amount, member_id, is_lodging) VALUES (${sql(cost.id)}, ${sql(demoTrip.id)}, ${sql(cost.label)}, ${sql(cost.category)}, ${sql(cost.splitType)}, ${sql(cost.amount)}, ${sql(cost.memberId)}, ${sql(cost.isLodging)});`,
  );
}

for (const [costItemId, userIds] of Object.entries(demoParticipants)) {
  for (const userId of userIds) {
    lines.push(`INSERT OR IGNORE INTO cost_item_participants (cost_item_id, user_id) VALUES (${sql(costItemId)}, ${sql(userId)});`);
  }
}

for (const milestone of demoMilestones) {
  lines.push(
    `INSERT OR IGNORE INTO milestones (id, trip_id, name, due_date, kind, amount_rule, amount, sort_order) VALUES (${sql(milestone.id)}, ${sql(demoTrip.id)}, ${sql(milestone.name)}, ${sql(milestone.dueDate)}, ${sql(milestone.kind)}, ${sql(milestone.amountRule)}, ${sql(milestone.amount)}, ${sql(milestone.sortOrder)});`,
  );
}

for (const spot of demoSpots) {
  lines.push(
    `INSERT OR IGNORE INTO sleep_spots (id, trip_id, room_name, bed_type, private_bath, private_room, weight_milli, capacity, sharing_enabled, reserved_for_honoree, sort_order) VALUES (${sql(spot.id)}, ${sql(demoTrip.id)}, ${sql(spot.roomName)}, ${sql(spot.bedType)}, ${sql(spot.privateBath)}, ${sql(spot.privateRoom)}, ${sql(spot.weight)}, ${sql(spot.capacity)}, ${sql(spot.sharingEnabled)}, ${sql(spot.reservedForHonoree)}, ${sql(spot.sortOrder)});`,
  );
}

for (const claim of demoClaims) {
  lines.push(
    `INSERT OR IGNORE INTO spot_claims (spot_id, user_id, status) VALUES (${sql(claim.spotId)}, ${sql(claim.userId)}, ${sql(claim.status)});`,
  );
}

for (const budget of demoBudgets) {
  lines.push(
    `INSERT OR IGNORE INTO private_budgets (trip_id, user_id, max_all_in, flex_note, must_haves, updated_at) VALUES (${sql(demoTrip.id)}, ${sql(budget.userId)}, ${sql(budget.maxAllIn)}, ${sql(budget.flexNote)}, ${sql(budget.mustHaves)}, '2026-11-21T17:00:00.000Z');`,
  );
}

for (const payment of demoPayments) {
  lines.push(
    `INSERT OR IGNORE INTO payments (id, milestone_id, user_id, amount, status, paid_at) VALUES (${sql(payment.id)}, ${sql(payment.milestoneId)}, ${sql(payment.userId)}, ${sql(payment.amount)}, ${sql(payment.status)}, ${sql(payment.paidAt)});`,
  );
}

lines.push("");
writeFileSync(new URL("../seed/demo.sql", import.meta.url), lines.join("\n"));
console.log(`Wrote seed/demo.sql (${lines.length} lines)`);
