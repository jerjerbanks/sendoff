import { DEMO_TRIP_ID, LAKE_TRIP_ID, RETIRED_DEMO_TRIP_ID } from "./constants";
import { FUNNEL_STEPS, type FunnelStep } from "./funnel";
import { contactKey } from "./tokens";

/**
 * Usage for the operator's /admin page. usageStats is aggregate counts; insights (below)
 * adds who is trying it. Budgets never leave this module (private_budgets is never read),
 * and contacts only leave it masked. A handful of queries; nothing is recalculated.
 */

export interface UsageStats {
  generatedAt: string;
  funnel: { step: FunnelStep; total: number; last7: number }[];
  trips: { total: number; byStatus: { status: string; count: number }[] };
  signedInPhones: { active: number; new7: number };
  recent: { idShort: string; tripType: string; status: string; members: number; committed: number; lastActive: string | null }[];
}

/** The slice of D1 this needs, so tests can run it against plain SQLite. */
export interface StatsDb {
  prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }> } };
}

const NOT_DEMO = `trip_id NOT IN ('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}', '${RETIRED_DEMO_TRIP_ID}')`;

export async function usageStats(db: StatsDb, now = new Date()): Promise<UsageStats> {
  const nowIso = now.toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [funnelRows, statusRows, phoneRows, recentRows] = await Promise.all([
    db
      .prepare(`SELECT step, COUNT(*) AS total, SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS last7 FROM funnel_events WHERE ${NOT_DEMO} GROUP BY step`)
      .bind(weekAgo)
      .all<{ step: string; total: number; last7: number }>(),
    db
      .prepare(`SELECT CASE WHEN deleted_at IS NOT NULL THEN 'deleted' ELSE status END AS status, COUNT(*) AS count FROM trips WHERE id NOT IN ('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}', '${RETIRED_DEMO_TRIP_ID}') GROUP BY 1`)
      .bind()
      .all<{ status: string; count: number }>(),
    db
      .prepare("SELECT SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new7 FROM sessions WHERE demo = 0")
      .bind(nowIso, weekAgo)
      .all<{ active: number | null; new7: number | null }>(),
    db
      .prepare(
        `SELECT t.id AS id, t.trip_type AS tripType, CASE WHEN t.deleted_at IS NOT NULL THEN 'deleted' ELSE t.status END AS status,
           (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.status != 'off_trip') AS members,
           (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.status = 'committed') AS committed,
           COALESCE((SELECT MAX(e.at) FROM trip_events e WHERE e.trip_id = t.id), (SELECT MAX(f.at) FROM funnel_events f WHERE f.trip_id = t.id)) AS lastActive
         FROM trips t WHERE t.id NOT IN ('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}', '${RETIRED_DEMO_TRIP_ID}')
         ORDER BY lastActive IS NULL, lastActive DESC LIMIT 50`,
      )
      .bind()
      .all<{ id: string; tripType: string; status: string; members: number; committed: number; lastActive: string | null }>(),
  ]);
  const byStep = new Map(funnelRows.results.map((row) => [row.step, row]));
  const byStatus = statusRows.results.map((row) => ({ status: row.status, count: Number(row.count) }));
  return {
    generatedAt: nowIso,
    funnel: FUNNEL_STEPS.map((step) => ({ step, total: Number(byStep.get(step)?.total ?? 0), last7: Number(byStep.get(step)?.last7 ?? 0) })),
    trips: { total: byStatus.reduce((sum, row) => sum + row.count, 0), byStatus },
    signedInPhones: { active: Number(phoneRows.results[0]?.active ?? 0), new7: Number(phoneRows.results[0]?.new7 ?? 0) },
    recent: recentRows.results.map((row) => ({
      idShort: row.id.slice(0, 8),
      tripType: row.tripType,
      status: row.status,
      members: Number(row.members),
      committed: Number(row.committed),
      lastActive: row.lastActive,
    })),
  };
}

/* ------------------------------------------------------------------------------------------
 * Who is trying it (Nov 27): names, trips, invites and time in the app, for the operator only.
 * Still never reads private_budgets (or flex notes, must-haves, needs notes), and contacts
 * leave this module masked. Demo trips and their throwaway people are left out.
 * ---------------------------------------------------------------------------------------- */

export interface InsightPersonTrip {
  tripShort: string;
  tripName: string;
  role: string;
  status: string;
  organizerName: string | null;
}

export interface InsightPerson {
  key: string;
  name: string;
  contact: string;
  isYou: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
  seconds: number;
  seconds7: number;
  activeDays: number;
  trips: InsightPersonTrip[];
}

export interface InsightTripPerson {
  name: string;
  role: string;
  status: string;
  isYou: boolean;
  joinedAt: string | null;
  voted: boolean;
  committed: boolean;
  seconds: number;
}

export interface InsightTrip {
  idShort: string;
  name: string;
  tripType: string;
  status: string;
  createdAt: string | null;
  lastActive: string | null;
  organizerName: string;
  mine: boolean;
  approveJoiners: boolean;
  inviteOpens: number;
  inviteOpens7: number;
  waiting: number;
  declined: number;
  invitesJoined: number;
  seconds: number;
  people: InsightTripPerson[];
}

export interface Insights {
  generatedAt: string;
  youKnown: boolean;
  summary: {
    testers: number;
    testersActive7: number;
    testerSeconds7: number;
    testerSeconds: number;
    inviteOpens: number;
    inviteOpens7: number;
    invitesJoined: number;
    invitesJoined7: number;
    trackingSince: string | null;
  };
  people: InsightPerson[];
  trips: InsightTrip[];
}

const DEMO_IDS = `('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}', '${RETIRED_DEMO_TRIP_ID}')`;

/** "je…@gmail.com" or "•••-•••-1234". Enough to tell people apart, not enough to contact them. */
export function maskContact(contact: string | null | undefined): string {
  const value = (contact ?? "").trim();
  if (!value) return "";
  const at = value.indexOf("@");
  if (at > 0) return `${value.slice(0, Math.min(2, at))}…${value.slice(at)}`;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `•••-•••-${digits.slice(-4)}`;
}

function maxIso(...values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const value of values) if (value && (!best || value > best)) best = value;
  return best;
}

function minIso(...values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const value of values) if (value && (!best || value < best)) best = value;
  return best;
}

/**
 * Everything the admin page lists, in a fixed handful of queries (no per-row queries).
 * `me` is the person signed in to the app in the admin's browser, if any: their trips and
 * anyone sharing their phone or email are marked, so real testers stand out.
 */
export async function insights(db: StatsDb, me: { userId: string } | null, now = new Date()): Promise<Insights> {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const weekAgoDay = weekAgo.slice(0, 10);
  const run = <T,>(sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values).all<T>().then((r) => r.results);
  const [tripRows, memberRows, requestRows, funnelRows, activityRows, dayRows, sessionRows, openRows, meRows] = await Promise.all([
    run<{ id: string; name: string; tripType: string; status: string; organizerId: string; approveJoiners: number; createdAt: string | null; lastActive: string | null }>(
      `SELECT t.id AS id, t.name AS name, t.trip_type AS tripType, CASE WHEN t.deleted_at IS NOT NULL THEN 'deleted' ELSE t.status END AS status,
         t.organizer_id AS organizerId, t.approve_joiners AS approveJoiners,
         COALESCE((SELECT MIN(f.at) FROM funnel_events f WHERE f.trip_id = t.id AND f.step = 'trip_created'), (SELECT MIN(e.at) FROM trip_events e WHERE e.trip_id = t.id)) AS createdAt,
         COALESCE((SELECT MAX(e.at) FROM trip_events e WHERE e.trip_id = t.id), (SELECT MAX(f.at) FROM funnel_events f WHERE f.trip_id = t.id)) AS lastActive
       FROM trips t WHERE t.id NOT IN ${DEMO_IDS}
       ORDER BY lastActive IS NULL, lastActive DESC LIMIT 100`,
    ),
    run<{ tripId: string; userId: string; role: string; status: string; name: string; contact: string }>(
      `SELECT m.trip_id AS tripId, m.user_id AS userId, m.role AS role, m.status AS status, u.name AS name, u.contact AS contact
       FROM trip_members m JOIN users u ON u.id = m.user_id WHERE m.trip_id NOT IN ${DEMO_IDS}`,
    ),
    run<{ tripId: string; userId: string; status: string; createdAt: string; name: string; contact: string }>(
      `SELECT r.trip_id AS tripId, r.user_id AS userId, r.status AS status, r.created_at AS createdAt, u.name AS name, u.contact AS contact
       FROM join_requests r JOIN users u ON u.id = r.user_id WHERE r.trip_id NOT IN ${DEMO_IDS} AND r.status != 'approved'`,
    ),
    run<{ tripId: string; userId: string; step: string; at: string }>(
      `SELECT trip_id AS tripId, user_id AS userId, step, at FROM funnel_events WHERE trip_id NOT IN ${DEMO_IDS}`,
    ),
    run<{ userId: string; tripId: string; seconds: number; seconds7: number; firstAt: string; lastAt: string }>(
      `SELECT user_id AS userId, trip_id AS tripId, SUM(seconds) AS seconds, SUM(CASE WHEN day >= ? THEN seconds ELSE 0 END) AS seconds7,
         MIN(first_at) AS firstAt, MAX(last_at) AS lastAt
       FROM activity_days GROUP BY user_id, trip_id`,
      weekAgoDay,
    ),
    run<{ userId: string; days: number }>(`SELECT user_id AS userId, COUNT(DISTINCT day) AS days FROM activity_days GROUP BY user_id`),
    run<{ userId: string; firstAt: string; lastAt: string }>(
      `SELECT user_id AS userId, MIN(created_at) AS firstAt, MAX(created_at) AS lastAt FROM sessions WHERE demo = 0 GROUP BY user_id`,
    ),
    run<{ tripId: string; opens: number; opens7: number; since: string }>(
      `SELECT trip_id AS tripId, SUM(opens) AS opens, SUM(CASE WHEN day >= ? THEN opens ELSE 0 END) AS opens7, MIN(day) AS since FROM invite_opens GROUP BY trip_id`,
      weekAgoDay,
    ),
    me ? run<{ contact: string }>(`SELECT contact FROM users WHERE id = ?`, me.userId) : Promise.resolve([] as { contact: string }[]),
  ]);

  const tripIds = new Set(tripRows.map((trip) => trip.id));
  const myContact = meRows[0]?.contact ? contactKey(meRows[0].contact) : null;
  const isMe = (userId: string, contact: string) => !!me && (userId === me.userId || (!!myContact && contactKey(contact) === myContact));

  // Who is who: members (honorees are names an organizer typed, not people trying the app) and askers.
  type Who = { userId: string; name: string; contact: string; you: boolean };
  const who = new Map<string, Who>();
  for (const row of [...memberRows, ...requestRows]) {
    if (!tripIds.has(row.tripId)) continue;
    if ("role" in row && row.role === "honoree") continue;
    if (!who.has(row.userId)) who.set(row.userId, { userId: row.userId, name: row.name, contact: row.contact, you: isMe(row.userId, row.contact) });
  }
  // One person can have several user ids (a new phone, a different trip): group by contact.
  const keys = new Map<string, string>();
  const personKey = (userId: string) => {
    const person = who.get(userId);
    const contact = person?.contact ? `c:${contactKey(person.contact)}` : `u:${userId}`;
    // A plain row number as the key, so the unmasked contact never leaves this module.
    if (!keys.has(contact)) keys.set(contact, `p${keys.size + 1}`);
    return keys.get(contact)!;
  };

  const steps = new Map<string, Map<string, string>>(); // trip|user -> step -> at
  for (const row of funnelRows) {
    const id = `${row.tripId}|${row.userId}`;
    if (!steps.has(id)) steps.set(id, new Map());
    steps.get(id)!.set(row.step, row.at);
  }
  const activityByTripUser = new Map<string, number>();
  const activityByUser = new Map<string, { seconds: number; seconds7: number; firstAt: string | null; lastAt: string | null }>();
  let trackingSince: string | null = null;
  for (const row of activityRows) {
    activityByTripUser.set(`${row.tripId}|${row.userId}`, (activityByTripUser.get(`${row.tripId}|${row.userId}`) ?? 0) + Number(row.seconds));
    const sum = activityByUser.get(row.userId) ?? { seconds: 0, seconds7: 0, firstAt: null, lastAt: null };
    sum.seconds += Number(row.seconds);
    sum.seconds7 += Number(row.seconds7);
    sum.firstAt = minIso(sum.firstAt, row.firstAt);
    sum.lastAt = maxIso(sum.lastAt, row.lastAt);
    activityByUser.set(row.userId, sum);
    trackingSince = minIso(trackingSince, row.firstAt);
  }
  const daysByUser = new Map(dayRows.map((row) => [row.userId, Number(row.days)]));
  const sessionByUser = new Map(sessionRows.map((row) => [row.userId, row]));
  const opensByTrip = new Map(openRows.map((row) => [row.tripId, row]));
  for (const row of openRows) trackingSince = minIso(trackingSince, `${row.since}T00:00:00.000Z`);

  const nameOf = (userId: string) => who.get(userId)?.name ?? memberRows.find((row) => row.userId === userId)?.name ?? "Someone";
  const tripById = new Map(tripRows.map((trip) => [trip.id, trip]));

  // Trips.
  const trips: InsightTrip[] = tripRows.map((trip) => {
    const members = memberRows.filter((row) => row.tripId === trip.id && row.status !== "off_trip");
    const people: InsightTripPerson[] = members.map((row) => {
      const done = steps.get(`${trip.id}|${row.userId}`);
      return {
        name: row.name,
        role: row.role,
        status: row.status,
        isYou: row.role !== "honoree" && isMe(row.userId, row.contact),
        joinedAt: done?.get(row.role === "organizer" ? "trip_created" : "member_joined") ?? null,
        voted: !!done?.has("voted"),
        committed: row.role !== "honoree" && row.status === "committed",
        seconds: activityByTripUser.get(`${trip.id}|${row.userId}`) ?? 0,
      };
    });
    const order = (role: string) => (role === "organizer" ? 0 : role === "honoree" ? 2 : 1);
    people.sort((a, b) => order(a.role) - order(b.role) || (a.joinedAt ?? "").localeCompare(b.joinedAt ?? ""));
    const requests = requestRows.filter((row) => row.tripId === trip.id);
    const opens = opensByTrip.get(trip.id);
    const organizer = memberRows.find((row) => row.tripId === trip.id && row.userId === trip.organizerId);
    return {
      idShort: trip.id.slice(0, 8),
      name: trip.name,
      tripType: trip.tripType,
      status: trip.status,
      createdAt: trip.createdAt,
      lastActive: trip.lastActive,
      organizerName: organizer?.name ?? nameOf(trip.organizerId),
      mine: !!organizer && isMe(organizer.userId, organizer.contact),
      approveJoiners: trip.approveJoiners === 1,
      inviteOpens: Number(opens?.opens ?? 0),
      inviteOpens7: Number(opens?.opens7 ?? 0),
      waiting: requests.filter((row) => row.status === "pending").length,
      declined: requests.filter((row) => row.status === "declined").length,
      invitesJoined: members.filter((row) => row.role === "member").length,
      seconds: [...activityByTripUser.entries()].filter(([id]) => id.startsWith(`${trip.id}|`)).reduce((sum, [, s]) => sum + s, 0),
      people,
    };
  });

  // People, one row per phone or email.
  const people = new Map<string, InsightPerson>();
  for (const person of who.values()) {
    const key = personKey(person.userId);
    const activity = activityByUser.get(person.userId);
    const session = sessionByUser.get(person.userId);
    const funnelTimes = funnelRows.filter((row) => row.userId === person.userId).map((row) => row.at);
    const asked = requestRows.filter((row) => row.userId === person.userId).map((row) => row.createdAt);
    const row: InsightPerson = people.get(key) ?? {
      key,
      name: person.name,
      contact: maskContact(person.contact),
      isYou: person.you,
      firstSeen: null,
      lastSeen: null,
      seconds: 0,
      seconds7: 0,
      activeDays: 0,
      trips: [],
    };
    row.isYou ||= person.you;
    row.firstSeen = minIso(row.firstSeen, session?.firstAt, activity?.firstAt, ...funnelTimes, ...asked);
    row.lastSeen = maxIso(row.lastSeen, session?.lastAt, activity?.lastAt, ...funnelTimes, ...asked);
    row.seconds += activity?.seconds ?? 0;
    row.seconds7 += activity?.seconds7 ?? 0;
    row.activeDays += daysByUser.get(person.userId) ?? 0;
    for (const member of memberRows.filter((m) => m.userId === person.userId && tripIds.has(m.tripId))) {
      const trip = tripById.get(member.tripId)!;
      row.trips.push({
        tripShort: trip.id.slice(0, 8),
        tripName: trip.name,
        role: member.role,
        status: trip.status === "deleted" ? "deleted" : member.status,
        organizerName: member.role === "organizer" ? null : nameOf(trip.organizerId),
      });
    }
    for (const request of requestRows.filter((r) => r.userId === person.userId)) {
      const trip = tripById.get(request.tripId);
      if (!trip) continue;
      row.trips.push({ tripShort: trip.id.slice(0, 8), tripName: trip.name, role: "asked", status: request.status, organizerName: nameOf(trip.organizerId) });
    }
    people.set(key, row);
  }
  const peopleList = [...people.values()].sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));

  const testers = peopleList.filter((person) => !person.isYou);
  const joins = funnelRows.filter((row) => row.step === "member_joined" && tripIds.has(row.tripId));
  return {
    generatedAt: now.toISOString(),
    youKnown: !!me,
    summary: {
      testers: testers.length,
      testersActive7: testers.filter((person) => (person.lastSeen ?? "") >= weekAgo).length,
      testerSeconds7: testers.reduce((sum, person) => sum + person.seconds7, 0),
      testerSeconds: testers.reduce((sum, person) => sum + person.seconds, 0),
      inviteOpens: trips.reduce((sum, trip) => sum + trip.inviteOpens, 0),
      inviteOpens7: trips.reduce((sum, trip) => sum + trip.inviteOpens7, 0),
      invitesJoined: joins.length,
      invitesJoined7: joins.filter((row) => row.at >= weekAgo).length,
      trackingSince,
    },
    people: peopleList,
    trips,
  };
}

/** "1h 05m", "12m", "40s", or "—" for nothing recorded. */
export function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
