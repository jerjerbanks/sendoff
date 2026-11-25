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

**One-time fix before the first `npm run db:migrate` on live:** migrations
0001–0008 were run on live as raw SQL, so live has no record of them. Run
`scripts/resync-d1-migrations.sql` once on live (instructions are in the file).
Never run it on staging.

## Setting up staging (first time only)

The `sendoff-staging` database already exists (created 2026-11-25, empty).

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
