# Deploying Field Trip

Two environments, each with its own Worker and its own D1 database:

| | Worker | D1 database | URL |
|---|---|---|---|
| **Live** | `sendoff` | `sendoff` (`863cbb95-…`) | sendoff.jccmiel92.workers.dev |
| **Staging** | `sendoff-staging` | `sendoff-staging` (`61f28fc3-…`) | sendoff-staging.jccmiel92.workers.dev |

Staging never shares data with live. Burst tests, migration rehearsals and risky
changes go to staging first.

## Branches

`main` is what's live. Work happens on a branch, CI must pass, and the branch
merges into `main` before it's deployed to live. Deploy a branch to staging
before it merges if it changes the database or anything risky.

## Automatic deploys (`.github/workflows/deploy.yml`)

- **Open or update a PR** → typecheck, tests, `migrations apply` on the staging
  D1, demo seed, build, deploy to `sendoff-staging`, re-apply cpu_ms 50 and
  Workers Logs, smoke check.
- **Merge to `main`** → the same against live: migrations on the live D1
  first, then the `sendoff` Worker.
- One deploy per environment at a time (`concurrency`, never cancelled
  mid-run). PRs from forks never deploy and never see secrets.
- Needs two repo secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit,
  D1: Edit, Account Settings: Read, this account only) and
  `CLOUDFLARE_ACCOUNT_ID`.

The manual steps below are the fallback.

## Every deploy

1. **CI is green** on the commit (typecheck, lint, tests, migrations from
   scratch, both builds).
2. **Staging first.**
   ```bash
   npm run db:migrate:staging   # applies any new migrations to staging D1
   npm run deploy:staging       # builds with CLOUDFLARE_ENV=staging and deploys
   ```
   Check the change on the staging URL.
3. **Live.**
   ```bash
   npm run db:migrate           # new migrations on live D1, BEFORE the code
   npm run build && npm run deploy:vinext
   ```
   Migrations go first because the new code reads the new tables. Write
   migrations so the old code still works with them (add tables and columns;
   don't rename or drop in the same release).
4. **Check live**: the page loads, the demo tour works, and Workers Logs show no
   new errors.

## Migrations

New schema changes go in `migrations/NNNN_name.sql`, numbered in order, and are
applied with `wrangler d1 migrations apply` (the `db:migrate*` scripts), which
records each one in the `d1_migrations` table.

**Done 2026-11-24 10:46 PM CT:** migrations 0001–0009 were run on live as raw
SQL, so `scripts/resync-d1-migrations.sql` was run once on live to record them
in `d1_migrations` (9 rows). From 0010 on, never apply migrations as raw SQL.
Never run the resync on staging.

## Setting up staging (first time only)

Done 2026-11-24 10:48 PM CT: `sendoff-staging` D1 has 0001–0009 applied via
the migration table, the demo seed, and the Worker is live at
sendoff-staging.jccmiel92.workers.dev. The commands below rebuild it.

```bash
npm run db:migrate:staging   # all migrations, from empty
npm run db:seed:staging      # the demo trips
npm run deploy:staging
```

The staging Worker gets its own rate-limit namespaces (1003, 1004), so its
counters never mix with live's.

## Backups and restore

D1 Time Travel keeps a restorable history of every database automatically; on
the Workers paid plan it reaches back 30 days. Nothing to set up. To restore
live to a point in time (this overwrites the current data, so take a note of
the current bookmark first):

```bash
wrangler d1 time-travel info sendoff                           # current bookmark
wrangler d1 time-travel restore sendoff --timestamp=2026-11-25T02:00:00Z
```

Rehearse a restore on staging once before real trips depend on it. For a copy
you keep yourself: `wrangler d1 export sendoff --remote --output=backup.sql`.
