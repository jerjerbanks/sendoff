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
