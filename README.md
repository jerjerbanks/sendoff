# Sendoff

A phone-first prototype for planning one bachelor party: vote the weekend, see what each person owes, and collect a non-refundable buy-in without anyone fronting the bill.

There is no account system. You pick a name, and a cookie remembers who you're viewing as. The demo includes a switcher so one person can click through as the organizer, a member, the guest of honor, or someone who gets dropped.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4747](http://127.0.0.1:4747). `npm run dev` creates the SQLite file, seeds Alex's party if it isn't there, and starts Next.js.

Other commands:

```bash
npm test          # cost, deadline, and forfeit math
npm run typecheck
npm run lint
npm run seed      # create the database and seed without starting the server
```

The database lives at `data/sendoff.db`. Delete that file to start over. Inside the demo, **Reset demo** does the same for the seeded trip.

## Demo

Open **Alex's demo party**. You land as Chris Hale, the organizer.

The seeded crew:

| Person | Role | Seed status |
| --- | --- | --- |
| Chris Hale | Organizer, pays | Committed, $150 test buy-in |
| Alex Mora | Guest of honor | Auto-committed, pays nothing, never dropped |
| Sam Okonkwo, Jordan Ellis, Drew Patel | Members | Committed, in on tee times |
| Taylor Nguyen, Riley Chen, Morgan Blake | Members | Joined, not committed |

Costs:

- Base pool **$3,290** — Airbnb $2,400 + group activities $600 + Alex's flight $290
- Tee times **$480**, optional, split four ways at **$120** (Chris, Sam, Jordan, Drew)
- Chris's own flight **$280**

Before the deadline Chris's share is **$870–$1,058**: $870 if all 7 payers commit, $1,058 if only the minimum 5 pay. Shares round up to the next whole dollar. When that rounding creates spare change, it stays in the trip pot and the screen says so.

Click through:

1. **Vote** — approval voting on Nashville, Scottsdale, and Lake of the Ozarks, plus dates and activities. Chris can lock a winner.
2. **Costs** — opt in or out of tee times while buy-in is open. Add a personal flight.
3. Switch to **Taylor** and pay the **$150 test buy-in**. The base share, if nobody else commits, becomes **$658**.
4. **QA → Simulate deadline now**. With Taylor in, five payers meet the minimum and the trip locks in. Without Taylor, P=4, the trip goes under minimum, and the test buy-ins are marked refunded.
5. After a lock-in, **QA → Day after 2nd payment**, then as Chris move Taylor off the trip. Taylor's $150 is forfeited into the base pool only, and the base share becomes **$785**. Tee times stay $120 because Taylor was never on them.

The guest of honor can be viewed from the switcher. Alex has no pay button.

People who miss the deadline cannot rejoin. Extending a short trip does not bring them back.

## What's real

- Trip creation, invite link, and mock join (name + phone or email, stored in a cookie)
- Three polls, approval votes, deadlines, and an organizer lock
- Shared, individual, and optional costs, including opt-in while buy-in is open
- Whole-dollar round-up, pot remainder, buy-in as the first slice of a person's total
- Deadline processing on page load and from **Simulate deadline now**
- Under-minimum stub refunds, cancellation refunds, and post-lock-in forfeiture that only reduces the base pool
- Milestone schedule (buy-in, second payment, final) and a per-person paid / due / late grid
- The guest of honor is auto-committed, pays no buy-in, and is never dropped
- The organizer pays the same stub buy-in as everyone else
- Buy-in amount and deadline lock after the first commit

## What's stubbed

- **Payments.** Every "Pay (test)" button only marks a row paid. No card, no Stripe, no money movement. Live keys are not read.
- **Prices.** Lodging, flights, and activities are typed in by hand.
- **Notifications.** Banners on the trip only. Nothing is emailed or texted.
- **Auth.** The cookie is a name, not a login. The member switcher can become anyone on the trip.
- **Golf and camping.** `trip_type` is stored (`bachelor`, and the field allows `golf` or `camping`) but only the bachelor party is built.

## Tests

`npm test` covers the v1.1 fixtures: N=4 Chris is $1,414, N=5 is Chris $1,278 and Taylor $728, and Example E after a booked late drop is Chris $1,365, Sam $1,271, Jordan $1,088, Drew $1,034, with tee times still $120.

## Deploy to Cloudflare Workers + D1

Do not deploy from this environment. No Cloudflare credentials are used here. Payments stay stubbed. No env vars are required.

`wrangler.jsonc` binds D1 as `DB` on database name `sendoff`. `database_id` is a placeholder (`00000000-0000-0000-0000-000000000000`). Replace it with the id from `wrangler d1 create` before a remote migrate or deploy.

```bash
npx wrangler login
npx wrangler d1 create sendoff
# paste the returned database_id into wrangler.jsonc

npm run db:migrate          # remote schema
npm run db:seed             # remote demo rows (INSERT OR IGNORE)
npm run build               # Worker bundle in dist/
npx wrangler deploy --config dist/server/wrangler.json
```

Local:

```bash
npm run dev                 # applies local D1 migrations, then vite on port 4747
npm run db:seed:local       # optional; the app also seeds the demo trip on first request
```

Order is always migrate, then seed, then deploy. Seed is safe to re-run.

The app runs on vinext (Next.js App Router on workerd). `npm run build` is `vite build` and writes the Worker wrangler config to `dist/server/wrangler.json`, including the D1 binding.

## Ready for spec v1.2, not finished

- `trips.min_headcount` and `trips.max_headcount` both exist. The forecast walks from the minimum through the max, using real members first and unnamed extra payers after that.
- Bed claims are `spot_claims (spot_id, user_id, status)`, not a column on the bed. The cost engine only sees approved claims. A sharing-enabled king or queen splits its weight across up to two approved claims.
- `trips.bed_change_policy` is `member_requests` or `locked`. `member_requests` files a pending claim for a member; the organizer's claim is approved immediately. `locked` lets only the organizer assign beds.
- Not built yet: the organizer approval screen for pending claims, a request-to-share flow distinct from taking an open bed, and phantom-payer flight estimates inside the max-headcount forecast. Actual lodging still rebases on book.
