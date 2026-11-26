# Field Trip

A phone-first app for planning a group trip: one invite link, a vote on where
and when, a price everyone sees up front, rooms, and a buy-in by a deadline.
Households pay as one party. Budgets are private.

Field Trip is the provisional product name, set once in `APP_NAME`
(`src/lib/constants.ts`). The Worker, database, URL and cookie are still named
`sendoff`.

## Stack

Next.js app router on Cloudflare Workers via vinext,
D1 (SQLite) through Drizzle, Tailwind.

## Run locally

```bash
npm install
npm run dev        # applies migrations to a local D1, then serves http://localhost:4747
npm run db:seed:local
```

The guided demo is at `/demo`, and the family trip at `/demo?trip=trip_lake`.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

CI runs all of these, plus every migration from an empty database, on each push
and pull request (`.github/workflows/ci.yml`).

### End-to-end checks (Playwright, `e2e/`)

After each PR deploys to staging, the `e2e (staging)` job runs the whole suite
against sendoff-staging and reports pass/fail as a check on the PR, with a
summary and the HTML report on the Actions run. The suite covers the project
invariants (demo numbers, budget privacy, members-only trips, sessions and the
duplicate-contact refusal, the demo tour and `/demo/reset`) plus checks from
past handoffs.

```bash
npm run dev                     # or: npm run build && npm start
npm run e2e                     # whole suite against http://localhost:4747
E2E_BASE_URL=https://sendoff-staging.jccmiel92.workers.dev npm run e2e
E2E_BASE_URL=https://sendoff.jccmiel92.workers.dev npm run e2e:smoke   # live-safe subset
```

Tests find things by role, label and text, never by layout or CSS classes, so a
redesign that keeps the words and numbers keeps them green. Tests tagged
`@smoke` never create trips, join, pay or reset: on live they only open demo
pages, as any visitor taking the tour does. Real-trip tests (one new trip, two
join attempts per run) are staging and local only.

After a merge deploys live, the `live smoke (rollback on failure)` job runs the
`@smoke` subset against sendoff.jccmiel92.workers.dev. If it fails, the Worker
is rolled back to the version that was live before the deploy (recorded by the
deploy job) and the run fails with a "Live rolled back" summary. D1 migrations
are not rolled back; they are additive, so the previous code still runs.

## How it's put together

- **Sign-in.** The cookie holds a random session token; D1 stores only its
  SHA-256 hash (`src/lib/session.ts`). A phone or email signs someone in only
  until they've signed in once. After that, a second phone needs a one-use,
  15-minute link from Your party.
- **Authorization.** Server actions take the person from the session, never
  from the form, and organizer actions check that the record belongs to the
  organizer's own trip.
- **Rate limits.** Joining and creating trips are limited per client IP by a
  counter in D1 (`rate_hits`) and Cloudflare's rate-limit binding; either can
  refuse (`src/app/actions.ts`, `src/lib/rate-limit.ts`).
- **Payments are not real.** Pay buttons mark rows paid. No card or money moves.

## Deploying

See [docs/DEPLOY.md](docs/DEPLOY.md): staging first, migrations before code,
and how to restore from a backup.

## Funnel

Tester funnel counts live in D1's `funnel_events` (migration 0010): one row per member per step per trip, steps `trip_created`, `member_joined`, `voted`, `committed`. Demo trips (`trip_demo`, `trip_lake`) never write rows, and vote toggles or repeat payments don't add any. There's no admin route; read it with SQL.

Counts by step, all time and the last 7 days (live; for staging run `npx wrangler d1 execute sendoff-staging --env staging --remote --command "…"` with the same SQL):

```sh
npx wrangler d1 execute sendoff --remote --command "SELECT step, COUNT(*) AS all_time, SUM(at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')) AS last_7_days, COUNT(DISTINCT trip_id) AS trips FROM funnel_events GROUP BY step ORDER BY CASE step WHEN 'trip_created' THEN 1 WHEN 'member_joined' THEN 2 WHEN 'voted' THEN 3 WHEN 'committed' THEN 4 END"
```

Cleaning up a test trip deletes its rows with the rest of the trip: `DELETE FROM funnel_events WHERE trip_id = '…'`.
