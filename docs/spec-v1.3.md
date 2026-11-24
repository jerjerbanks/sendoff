# Trip App — MVP Spec v1.3 (Bachelor Party)

*November 24, 2026 · America/Chicago · v1.3 adds private budgets (a headline differentiator alongside room pricing) and per-person flight ranges. Decisions below are normative for the prototype.*

### Changelog (v1.3 — November 24, 2026, America/Chicago)

- **Private budget input (hero feature).** After joining, each member can enter a private all-in budget the organizer and the group never see. Poll options show an anonymized fit bucket (Fits everyone / Fits most / Over budget for the group). Each member also sees a private "you're under/over" line and cheaper-bed suggestions. Guys can vote honestly without having to say "I can't afford Cabo" in the group chat.  
- **Per-person flight ranges.** Personal flight items carry a home airport and a low–high estimate. Every all-in number that includes flights is shown as a range. Group feasibility uses the high estimate (conservative); the forecast slider shows bands.  
- **Validation metrics.** The prototype should instrument commitment rate, time-to-commit, organizer out-of-pocket vs. last trip, and invitees who later start their own trip — with a caveat that Jeremy's own network will overstate commitment.

### Changelog (v1.2 — November 24, 2026, America/Chicago)

* Capacity and shared beds. Trip has minHeadcount and maxHeadcount (payers). A king or queen can be shared by two guys, who split that spot's weight evenly. Sharing is enabled up front on the spot, or requested by members and approved by the organizer. The organizer can add any spot type at any time. A buy-in with no free slot is blocked until a spot is added or a share is approved.  
* Cost forecast. Headcount sensitivity is now a min-to-max sliding forecast (lodging estimate + prospective flights + other trip elements), plus an expanded-headcount scenario when shared beds raise capacity. When the actual lodging total is entered at booking, shares rebase immediately and each member sees old vs. new plus the updated forecast.  
* Bed switching policy. Trip.bedChangePolicy is member_requests (default: anyone can request a switch or share; the organizer approves) or locked (only the organizer moves people). The toggle lives in settings (S12).

### Changelog (v1.1 — November 24, 2026, America/Chicago)

* **Room-tiered lodging. The organizer prices sleeping spots by bed and privacy (a king with a private bath costs more than the couch). The groom is gifted the best room; his share spreads across payers in proportion to their weights. Members pick spots in buy-in order.**  
* **Commit-then-book. When committed payers reach the min headcount (or when the deadline hits and the min is met), the trip becomes booking_ready. Buy-ins stay refundable until the organizer marks the stay booked. Forfeiture starts only after booked. This replaces v1's locked_in status.**  
* **Headcount sensitivity. Everywhere a member sees their number, show the share at N = min through max committed, plus live deltas if one more person commits or someone drops.**

**Scope:** one trip type (bachelor party). **Payments:** simulated only — no real money moves. **Do not** spend, create paid accounts, or publish the prototype without Jeremy's OK.

This document is the build spec for a clickable prototype. It is written for the organizer who otherwise fronts the Airbnb and chases non-responders.

---

## 1\. Problem and target user

**First user:** the organizer of a bachelor party — the friend who plans the trip, puts the Airbnb on his card, and chases the guys who never respond. Members are first-class, but the product is built to take that organizer off the hook.

**The lived pain (several bachelor parties in the last two years):**

- One person organizes everything and fronts lodging.  
- Friends go silent, say "maybe," or drop late. Often they said yes in the group chat and then bail quietly because nobody wants to say "I can't afford Cabo."  
- People verbally commit before they know the real all-in cost (flights + lodging + activities).  
- The organizer is left holding a deposit and chasing Venmos.  
- There is no clean way to drop non-committers and re-split among the people who are actually going.

**What this MVP must do:**

- Make destination, dates, and activities a vote, not a group-text argument.  
- Show real all-in cost per person up front, with payment milestones, so each person can decide whether they can afford it.  
- Require a buy-in by a deadline — you are in, or you are off the trip. The buy-in is refundable until the stay is booked, and forfeited only after it is booked.  
- Split shared costs **only among people who have committed**, so no single person is on the hook.  
- Default: the **groom (honoree) is excluded from the cost split**.  
- Price the Airbnb by the bed you actually sleep in, not an even split: nicer rooms cost more, the couch costs less, and the groom is gifted the best room.  
- Show how each person's number moves as headcount goes up or down, so people can decide with eyes open.  
- Let each guy enter a private all-in budget and see, privately, whether a destination or bed choice fits — without anyone else seeing the number.  
- Show flight costs as a range (low to high), not a fake-precise single fare.

---

## 2\. Differentiation

*Based on the November 24, 2026 [competitive scan](https://docs.google.com/document/d/1RUtAw5swlmuBy4SbmdbL9J4PbSvVXSlqKYTaG1qKGgk/edit). Confidence: Medium-High on who does what; High that Airbnb split pay is gone.* The landscape is not empty. The pain is real — Airbnb launched global split payments in 2017 and killed them in 2018; they have not come back. Splitwise and Venmo own after-the-fact settling, not before-the-booking commitment. Several products already collect money for group trips. Closest competitor: Let's Gravel. A consumer product with a “commitment amount” that locks a spot, installment plans, itinerary, chat, and payouts to the organizer, at 6.25% + $0.55 per payment. Free tier is one trip per year, up to 10 travelers; Pro is $29.99/month. Self-reported traction is small (tiny): 2,600 travelers, 80 organizers, 237 trips. Important limit: payouts go to the organizer's bank, so the organizer can still end up writing the lodging charge. SquadTrip and WeTravel already run deposits and payment plans at scale — but they are built for people selling trips (retreat hosts, tour operators), not a group of friends arguing about Nashville vs. Scottsdale. WeTravel has raised $92 million to hold funds and pay suppliers. Batch (formerly Bach) is the bachelor/bachelorette incumbent, with $17 million raised and a planning-plus-marketplace product (polls, itinerary, Venmo links). It owns distribution. It does not have a hard group buy-in that drops non-payers and re-splits lodging. Splitwise and Venmo settle IOUs after someone has already paid. They do not create commitment before the Airbnb is booked. Our wedge is a casual friend-group flow, not organizer/operator software:

* Vote on destination, dates, and activities.  
* See a real per-person number before paying — including a flight range, optional items (a tee time only some people join), and a priced bed.  
* Buy in by a deadline, or you are out, with automatic re-split among the people who committed.  
* Pay a fair share of the house based on the bed you actually sleep in, not an even split of the Airbnb.  
* Enter a private budget and vote with an anonymized "does this destination actually fit the group?" signal, so nobody has to admit they can't afford Cabo in the group chat.

Headline differentiators (two, and they work together):

- **Private budgets.** None of the competitors in the November 2026 scan let a friend-group vote on destinations against a private all-in number. Let's Gravel, Batch, SquadTrip, and WeTravel all make money or commitment visible to the organizer or the group. The shame of saying "I can't afford Cabo" is the silent killer of bachelor-party RSVPs. This product keeps the number private, shows only anonymized fit buckets on poll options, and tells each guy privately whether a cheaper bed gets him under budget.  
- **Room-tiered lodging.** None of those competitors price beds differently either. A king with a private bath costs more than the couch; the groom is gifted the best room; members who commit early pick first; and live prices plus a min-to-max forecast are visible before anyone buys in. Cheaper beds are also the lever that can bring a private budget back into range. The unsolved hard part: collecting a buy-in solves chasing, not fronting the Airbnb card. Airbnb still requires one guest to book and pay. Taking the organizer's card off that hook means the platform (or a licensed partner) holds funds and pays the host — money-transmitter, escrow, refund, and chargeback territory. “Non-refundable” is also not a legal shield; card networks still take chargebacks. What this prototype is for: payments stay stubbed. The goal is to test whether friends will actually prepay a buy-in that stays refundable until the stay is booked. Do not build a payments or escrow stack until that is proven.

## 3\. Screen list

Seventeen screens (S1–S17: the original twelve, plus sleeping-spot setup, spot picker, book stay, the approvals queue, and private budget entry). Stub auth is a user switcher on the landing screen (pick a seed persona or enter a display name). No real login.

### S1. Landing / join

**Purpose:** Enter the app, pick a persona, join a trip, or start one.

**Key elements:** App name; one-line value ("Plan the bachelor party. Commit, or you're off."); user switcher; "My trips" list for the selected persona; "Create a trip"; invite code field and join button.

**Actions:** Switch persona; create trip (S2); join with code or invite link (becomes `joined`, then S17 private budget, skippable, then S3); open an existing trip (S3).

### S2. Create trip

**Purpose:** Organizer starts a bachelor party trip.

**Key elements:** Trip name; honoree (groom) name; optional date window; buy-in amount; commit deadline (displayed in America/Chicago); minimum committed paying members (this is also the booking trigger); honoree excluded from split toggle (default on); notes.

**Actions:** Save trip in `draft`; generate invite link/code and move trip to `planning`; land on Trip home as organizer.

### S3. Trip home / dashboard

**Purpose:** Single source of truth for status, roster, decisions, and money.

**Key elements:** Trip name; honoree; trip status badge; locked destination and dates (once set); countdown to commit deadline; roster with status chips (`invited`, `joined`, `committed`, `dropped`, `declined`); poll summary; cost snapshot (your share or pre-deadline range, plus a headcount-sensitivity line); buy-in progress (X of Y committed, and whether the booking trigger is met); room badge (your claimed spot or “pick a bed,” and the honoree's reserved room); primary CTA that changes by role and state (including Book stay when booking_ready).

**Actions: Open polls, cost sheet or my breakdown, buy-in, spot picker, sleeping-spot setup or Book stay (organizer), milestones, or organizer settings. Off-the-trip members get a banner and are routed to S10.**

### S4. Polls list

**Purpose:** The three standard bachelor-party polls in one place.

**Key elements:** Cards for **Destination**, **Dates**, and **Activities**. Each shows open/locked, vote count, current leader, whether it can be locked, and (for Destination and Dates) an anonymized budget-fit badge on the current leader: "Fits everyone", "Fits most", or "Over budget for the group" (rules in 6.12). Activities polls do not show budget badges.

**Actions:** Open a poll (S5). Organizer can add options while the poll is open, can hide or unhide "Over budget for the group" options before voting opens, and can start the lock flow (S6).

### S5. Poll detail / vote

**Purpose:** Vote on one poll, with anonymized group fit and a private personal-fit line.

**Key elements:** Question; options (label, optional note or price hint, and for Destination/Dates a lodgingEstimate the organizer can set). Each Destination/Dates option shows an anonymized budget-fit badge (6.12) and, if at least 4 members have budgets, "based on N budgets" — never a count of who is over, and never a badge count when fewer than 6 members have budgets that would identify anyone. Hidden "Over budget" options are omitted from the member vote list (organizer can still see and unhide them). Privately, the viewing member sees "You're $X under" or "You're $X over" on each option, plus a cheaper-bed suggestion when they are over ("Couch or a shared queen gets you under by $Y"). The organizer sees the same anonymized badges, never individual budgets or who is over.

**Actions:** Cast or change a vote while the poll is open (one vote per member per poll). Organizer: add an option; set or edit lodgingEstimate; hide/unhide over-budget options before voting opens; start lock. Honoree can vote even though they do not pay (no personal budget fit, or a "the group covers you" note). `dropped` and `declined` members cannot vote. If a poll is still open when someone is dropped, their vote is excluded from counts.

### S6. Lock decision

**Purpose:** Organizer locks a poll's result into the trip plan.

**Key elements:** Leading option; full tally; ties called out; confirmation copy that locking sets the trip field and can change the cost sheet.

**Actions:** Lock the leader. On a tie, organizer must pick a winner before lock. Organizer may lock a non-leading option only if they record a short reason. Effect: poll becomes `locked`; Destination and Dates write through to the trip; locked Activities feed the cost sheet.

### S7. Cost sheet editor (organizer)

**Purpose:** Build the all-in cost picture.

**Key elements:** Line items with name, category (`lodging`, `flights`, `activities`, `tee_times`, `other`), amount (USD), split type (shared, individual, or optional), assignee if individual, opt-in roster if optional, notes, estimate flag; trip total; current vs. invited paying count; per-person share or pre-deadline range; honoree-exclusion note; minimum-members warning; rounding-remainder line once shares are official; isLodging flag on the Airbnb line (exactly one per trip) so it splits by SleepSpot weights, not evenly; whole-trip headcount-sensitivity table.

**Actions:** Add, edit, delete line items; toggle split type, assignee, and optional-item participants; members can also opt in or out of optional items from S8 while buy-in is open; publish or update the sheet (members then see S8). Publishing with buy-in and deadline set moves the trip from `planning` to `buy_in_open`. Estimates are allowed before polls are locked; locking a poll may require the organizer to update amounts.

### S8. My cost breakdown (member)

**Purpose:** Show this person the real number — or a range — before they buy in.

**Key elements:** Itemized shared shares, plus individual items and optional items they opted into; a control to opt in or out of optional items (for example tee times) while buy-in is open; buy-in called out as milestone 1 of their total (not an extra fee); remaining milestones; pre-deadline range and a forecast slider, now shown as bands where flights have a low–high estimate; honoree note ("The group covers the groom's share"); deadline countdown; live deltas computed with your claimed spot weight. Every total that includes a flight is a range, not a single fare.

**Actions: Go to buy-in (S9); go to spot picker (S14); back to dashboard.**

### S9. Buy-in commit + refundable-until-booked confirm

**Purpose:** The commitment moment.

**Key elements:** Buy-in amount; deadline; plain-language warning: "Your buy-in is refundable until the organizer books the stay. After the stay is booked, the buy-in is forfeited if you drop and is not returned." Acknowledgment checkbox; confirm button; visible label **Test payment — no card charged.**

**Actions:** Acknowledge and confirm → member status `committed`, stub Payment recorded as `paid`. Cancel returns to S8. The organizer is a paying member and must also complete this stub buy-in. The honoree does not see this screen when exclusion is on (`buyInWaived`).

### S10. Off-the-trip state

**Purpose:** Honest, limited view for people who declined, missed the deadline, or late-dropped.

**Key elements:** Status explanation ("You didn't complete the buy-in by \[deadline\], so you're off this trip." or "You dropped after buying in. Your buy-in was forfeited and stays with the trip."); read-only trip summary; no vote, no pay, no share of costs.

**Actions:** View the summary only. Rejoin is not in this MVP. Before the deadline, the organizer may re-invite a `declined` or early-dropped person from Settings; after the deadline, dropped stays dropped.

### S11. Milestones / payment grid

**Purpose:** After buy-in, show what is still owed and when.

**Key elements:** Grid of paying members (rows) by milestones (columns). Seed milestones: Buy-in (refundable until booked), Lodging, Balance. Cells show `paid`, `due`, `upcoming`, `waived`, or `forfeited` with amounts; per-person totals; overall progress. All pay actions labeled as test payments.

**Actions:** Member pays a due milestone (stub). Organizer defines or edits custom milestones (name, due date, fixed amount or remainder); can also mark a payment received (stub).

### S12. Organizer settings

**Purpose:** Trip-level controls.

**Key elements: Trip name; honoree; honoree-exclusion toggle; buy-in amount; commit deadline; minHeadcount and maxHeadcount (payers); bedChangePolicy toggle (member_requests or locked); copyable invite link/code; member management (mark declined, remove, re-invite before the deadline); a link to the approvals queue (S16); cancel trip; badge: "Payments are simulated — no real money moves." Prototype-only: "Simulate deadline now" control so the auto-drop path can be demoed without waiting.**

**Actions:** Save. Buy-in amount and deadline become locked once the first paying member commits. Cancel is available until the trip is `completed`.

---

### S13. Sleeping-spot setup (organizer)

Purpose: Define every sleeping spot in the rental, set capacity and sharing, and gift the groom the best room. Key elements: A list of SleepSpots: room name, bed type (king, queen, full, twin, bunk, sofa_bed, couch, air_mattress), private bath, private room, weight (default from the bed/privacy table, editable), capacity (1 or 2), allowSharing, reserved-for-honoree flag, and approved SpotClaims. Default weights unchanged from v1.1. The highest-weight spot is reservedForHonoree by default. The organizer can add any bed type at any time, not only an air mattress. Running total of payer capacity (sum of capacity on non-honoree-reserved spots) vs. maxHeadcount; warn if capacity < maxHeadcount. Link to the isLodging cost item. Live price of every spot, including the per-person price of a shared slot (spot weight / occupants). Actions: Add, edit, delete, or reorder spots; set capacity and allowSharing; edit weights; reserve or reassign the honoree spot; override, assign, or swap approved claims; save. Available from planning onward. After booked, only the organizer moves people, even if bedChangePolicy is member_requests, and prices rebase immediately.

### S14. Spot picker (member)

Purpose: After buying in, pick a sleeping spot in buy-in order, seeing a live price for each bed, and request a share or switch when the policy allows. Key elements: Every spot with room name, bed type, privacy, weight, capacity, live lodging price (and the shared-slot price if allowSharing or a share is open), and status (claimed, share available, reserved for the groom, available). Your place in the pick order (“Sam is picking; you’re next”). A min-to-max cost forecast slider (section 6.10), including the expanded-headcount scenario when sharing raises capacity. The honoree sees their reserved room as assigned, not pickable by others. If bedChangePolicy is member_requests, a request-to-share or request-to-switch form. If locked, copy explains that only the organizer can move people. Actions: If it is your turn (you are the earliest committed member without a spot), claim an available spot or, if allowSharing is on and a slot is open, buy into that shared slot directly (SpotClaim approved). Under member_requests, submit a share or switch SpotRequest (appears on the organizer's S16 queue). A drop frees the claim and everything re-prices. After you pick, back to the dashboard (the room badge updates).

### S15. Book stay (organizer)

Purpose: After the booking trigger is met, record that the stay is actually booked. Key elements: Current committed payer count vs. the minimum; a warning that booking now closes buy-in and drops anyone who has not committed; confirmation-number field; actual lodging total (prefilled with the cost-sheet amount, editable); stub-only badge. Actions: Submit → trip status booked; unpaid members are dropped; already-paid buy-ins stay paid and become forfeitable on a later drop. Cancel returns to booking_ready. If the actual lodging total differs from the estimate, shares rebase immediately: each member sees their old vs. new all-in and an updated min-to-max forecast that now uses the actual lodging total.

### S16. Approvals queue (organizer)

Purpose: Approve or deny share and switch requests, and see pending SpotClaims. Key elements: A list of pending SpotRequests (share or switch) with requester, target spot, live prices before and after, and counterpart if any. Pending SpotClaims (should be rare; allowSharing claims approve immediately). Counts of open requests. After booked, a warning that approving a move will rebase prices immediately. Actions: Approve (writes approved SpotClaims, frees the vacated slot, re-prices, updates the forecast) or deny. If bedChangePolicy is locked, this queue is empty of member requests; the organizer still assigns and swaps from S13.

### S17. Private budget entry (member)

**Purpose:** Capture a private all-in budget right after a member joins, before they vote, without exposing the number to anyone else.

**Key elements:** A clear privacy promise ("Only you see this number. The organizer and the group will never see your budget or whether a destination is over for you."). maxAllIn, in dollars, all-in including flights. Optional flexNote. Optional mustHaves multi-select (golf, own room, nightlife, other). Skip is available but nudged ("Even a rough number helps the group pick a destination you can actually do"). After save, a reminder that they can edit it until they buy in. If they already have a budget, this screen is the editor.

**Actions:** Save; skip for now (returns to S3, with a dashboard nudge to come back); edit later from S3 or S8, until buy-in is paid. No organizer or other-member action can open this screen for someone else.

## 4\. User flows and state machines

### 4.1 Eight-step core flow

1. Organizer creates the bachelor party trip and invite link.  
2. Members join via the link or code, then are asked for a private budget (S17, skippable, nudged).  
3. The group votes on destination, dates, and activities, with anonymized budget-fit badges on destination and date options.  
4. Organizer locks each decision.  
5. Organizer publishes the cost sheet; each person sees their all-in number or a pre-deadline range.  
6. Each paying member, including the organizer, pays a buy-in by the deadline (stub-refundable until booked), then picks a SleepSpot in commit order and can see how their share moves with headcount.  
7. Hitting the min headcount, or the deadline if the min is met, moves the trip to booking_ready (unpaid members are auto-dropped at the deadline). A trip under the minimum cannot be booked.  
8. The organizer books the stay (stub). After booked, remaining payment milestones are collected, and a late drop forfeits the buy-in.

### 4.2 Organizer flow

1. Open the app and pick or create the organizer persona (stub auth).  
2. Create a bachelor party trip: name it, name the groom, set buy-in, deadline, and minimum, leave honoree exclusion on.  
3. Copy the invite link or code and send it out of band (text, group chat).  
4. Add poll options for Destination, Dates, and Activities (or use seed options).  
5. Watch votes; lock each poll when ready (pick a winner on a tie).  
6. Set up sleeping spots (S13), gift the groom the best room, and mark the Airbnb line as isLodging. Build and publish the cost sheet (weighted lodging, activities, optional tee times, individual flights, honoree's flight treated as shared). Members now see a per-person range, a priced bed, and headcount sensitivity.  
7. Complete the organizer's own stub buy-in so they are a committed paying member.  
8. At the real deadline, or via **Simulate deadline now**, the system auto-drops non-committers, re-splits, and checks the minimum.  
9. If paying committers meet the minimum, the trip becomes booking_ready (this can also happen before the deadline, the moment the min is hit). The organizer then books the stay in S15 (stub). After booked, collect remaining milestones. A late drop now forfeits the buy-in.  
10. If they do not, the trip becomes `under_minimum`; organizer cancels (stub-refund buy-ins) or explicitly lowers the minimum with a warning, then confirms.

### 4.3 Member flow

1. Open the invite link or enter the code; pick or create a persona (stub auth).  
2. Join the trip; land on the private budget screen (S17). Save or skip; then Trip home as `joined`.  
3. Vote on Destination, Dates, and Activities (seeing group-fit badges and a private under/over line); change votes until each poll is locked.  
4. Review My cost breakdown, including the forecast band (flight low–high), optional items (opt in or out of tee times and the like), and that the group covers the groom.  
5. By the deadline: open Buy-in, acknowledge that the buy-in is refundable until the stay is booked and forfeited after, confirm the stub payment → committed, then pick a sleeping spot in buy-in order (S14).  
6. If they miss the deadline: auto-dropped → Off-the-trip state.  
7. If committed: pay remaining milestones when due (stub) and watch the payment grid.  
8. If they drop before the stay is booked: confirm drop, buy-in is stub-refunded, their spot is freed, and shares re-price. If they drop after booked: confirm late drop, buy-in is forfeited, the spot is freed, and everyone else's shares re-price.

### 4.4 Trip.status (plain text)

Statuses: draft, planning, buy_in_open, booking_ready, booked, under_minimum, cancelled, completed. v1's locked_in is replaced by booking_ready then booked.

draft \-- organizer generates invite \--> planning \-- organizer cancels \--> cancelled

planning \-- organizer publishes cost sheet with buy-in + deadline \--> buy_in_open \-- organizer cancels \--> cancelled

buy_in_open \-- \|P\| reaches minHeadcount (even before the deadline) \--> booking_ready \-- deadline reached, or organizer runs "Simulate deadline now", then auto-drop + re-price \--> branches: if paying committers >= minimum \--> booking_ready if paying committers < minimum \--> under_minimum \-- a committed member drops before booked \--> stay buy_in_open (spot freed, buy-in stub-refunded, re-price) \-- organizer cancels \--> cancelled (already-paid buy-ins are stub-refunded; the stay was never booked)

booking_ready \-- more members can still buy in until the organizer books, occupancy is full, or maxHeadcount is reached \-- a buy-in with no free slot is blocked until the organizer adds a spot or approves a share \-- \|P\| falls below minimum before booked \--> buy_in_open if deadline has not passed, else under_minimum (spot freed; buy-in stub-refunded) \-- organizer submits Book stay (S15): confirmation number + actual total; unpaid members are dropped; buy-in closes \--> booked \-- organizer cancels \--> cancelled (buy-ins stub-refunded)

booked \-- late drop: buy-in forfeited, spot freed, lodging and other shares re-price; if \|P\| now < minimum \--> under_minimum (forfeiture already applied) \-- organizer marks trip done (stub) \--> completed \-- organizer cancels \--> cancelled (after booked, already-forfeited buy-ins stay forfeited; other unforfeited payments are stub-refunded)

under_minimum \-- organizer explicitly lowers the minimum to match current committers (with warning) \--> booking_ready \-- organizer cancels \--> cancelled (already-paid buy-ins are stub-refunded unless they were already forfeited after a booked stay)

cancelled  (terminal) completed  (terminal; stub) Polls may still be open in `planning` or `buy_in_open`. Cost figures may be estimates until polls are locked. Closing a poll does not by itself change Trip.status.

### 4.5 TripMember.status (plain text)

Statuses: `invited`, `joined`, `committed`, `dropped`, `declined`. Role (`organizer`, `member`, `honoree`) is separate. The honoree is a roster member with `buyInWaived = true` when exclusion is on; they are treated as `committed` without paying and are not dropped at the deadline.

```
invited
  -- opens invite and joins --> joined
  -- organizer or member declines before paying --> declined
  -- deadline fires with no buy-in --> dropped  (reason: missed_deadline)

joined
  -- pays buy-in (stub; refundable until booked) --> committed
  -- declines before paying --> declined
  -- deadline fires with no buy-in --> dropped  (reason: missed_deadline)

committed
  -- member or organizer confirms a drop before booked --> dropped
       (reason: withdrew; buy-in stub-refunded; SleepSpot freed; re-price)
  -- member or organizer confirms a drop after booked --> dropped
       (reason: late_drop; buy-in Payment becomes forfeited; SleepSpot freed; re-price)
  -- honoree path: auto-committed, buy-in waived; not dropped at deadline

dropped   (terminal in this MVP after the deadline)
declined  (terminal unless organizer re-invites before the deadline --> invited)
```

There is exactly one organizer (the creator) and at most one honoree. The organizer is also a paying member unless they are somehow the honoree, which this MVP does not support.

---

## 5\. Data model

Money is stored as integer USD cents and displayed in dollars. All datetimes are stored in UTC and displayed in America/Chicago.

### User (stub)

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| displayName | string | Shown on roster and grid |
| email | string, optional | Stub only; not used for auth |

### Trip

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| name | string | e.g. Alex's Bachelor Party |
| type | enum | `bachelor_party` only in this MVP |
| status | enum | See section 4.4 |
| organizerUserId | FK User | Exactly one |
| honoreeName | string | Display name for the groom |
| honoreeMemberId | FK TripMember, nullable | Set when the honoree is on the roster |
| inviteCode | string | Unique; also used in the invite link |
| dateStart, dateEnd | date, nullable | Written when the Dates poll is locked |
| destination | string, nullable | Written when the Destination poll is locked |
| buyInAmount | money | Organizer-set flat amount |
| commitDeadline | datetime | Display in America/Chicago |
| minHeadcount | integer | Paying members required to go / trigger booking (honoree does not count). Replaces v1/v1.1 minimumCommitters (keep that name as a read alias). |
| maxHeadcount | integer | Maximum paying members. Payer bed capacity must be >= this value (warn otherwise). Seed: 8\. |
| bedChangePolicy | enum | `member_requests` (default) or `locked`. See section 6.11. |
| bookingConfirmation | string, nullable | Entered on S15. |
| actualLodgingTotal | money, nullable | Entered on S15; rebases shares immediately. |
| bookedAt | datetime, nullable | Written when the trip moves to booked. |
| honoreeExcludedFromSplit | boolean | Default true |
| currency | string | `USD` only |
| createdAt, updatedAt | datetime |  |

### TripMember

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| tripId | FK Trip |  |
| userId | FK User |  |
| role | enum | `organizer`, `member`, `honoree` |
| status | enum | See section 4.5 |
| buyInWaived | boolean | True for honoree when exclusion is on |
| dropReason | enum, nullable | `missed_deadline`, `late_drop`, `removed` |
| forfeitureAmount | money | Buy-in forfeited on late drop; else 0 |
| joinedAt, committedAt, droppedAt | datetime, nullable |  |

Unique on (tripId, userId).

### Poll

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| tripId | FK Trip |  |
| type | enum | `destination`, `dates`, `activities` |
| status | enum | `open`, `locked` |
| lockedOptionId | FK PollOption, nullable |  |
| lockedAt | datetime, nullable |  |
| lockedByUserId | FK User, nullable |  |
| lockReason | string, nullable | Required if organizer locks a non-leader |

One poll per type per trip in this MVP.

### PollOption

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| pollId | FK Poll |  |
| label | string |  |
| notes | string, optional | Price hint, date range detail, etc. |
| lodgingEstimate | money, nullable | Organizer-entered lodging total for this destination or date option; used for budget-fit. Required for a Destination option to show a badge. |
| hiddenByOrganizer | boolean | Default false. Organizer may hide "Over budget for the group" options before voting opens. |
| sortOrder | integer |  |

### Vote

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| pollId | FK Poll |  |
| optionId | FK PollOption |  |
| memberId | FK TripMember |  |
| updatedAt | datetime |  |

Unique on (pollId, memberId). One vote per member per poll; last write wins until the poll is locked.

### CostItem

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| tripId | FK Trip |  |
| name | string |  |
| category | enum | `lodging`, `flights`, `activities`, `tee_times`, `other` |
| amount | money | Total, not per person. For an individual flight, this is the midpoint of lowEstimate and highEstimate and is what milestones use until a fare is confirmed. |
| splitType | enum | `shared, individual, or optional (optional items split among CostItemParticipant members who are also in P)` |
| assignedMemberId | FK TripMember, nullable | Required if individual |
| homeAirport | string, nullable | IATA code; used on individual flight items |
| lowEstimate | money, nullable | Low end of a personal flight (or other individual) estimate. Manual entry in this MVP (flight API is later). |
| highEstimate | money, nullable | High end. Group feasibility always uses this number (conservative). |
| notes | string, optional |  |
| isEstimate | boolean |  |
| active | boolean | Set false if an individual item's assignee is dropped |

### CostItemParticipant

An optional item's opted-in roster. Unique on (costItemId, memberId). Corresponds to (cost_item_id, user_id) on the trip; memberId is the TripMember for that user.

### CostItemParticipant fields

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| costItemId | FK CostItem | The optional line item |
| memberId | FK TripMember | Who opted in; unique with costItemId. This is the user on this trip (user_id). |
| optedInAt | datetime | When they opted in |

### SleepSpot

One row per bed in the rental. Total bed capacity (sum of SleepSpot.capacity, counting only payer-eligible slots: all spots except a reserved honoree spot) must be >= maxHeadcount; warn the organizer otherwise. The organizer can add any bed type at any time. Fields: id (string, PK); tripId (FK Trip); roomName (string); bedType (enum: king, queen, full, twin, bunk, sofa_bed, couch, air_mattress); privateBath (boolean); privateRoom (boolean); weight (decimal, default from section 6.8, organizer-editable); capacity (1 or 2; default 1; 2 is offered for king or queen, and the organizer can set 2 on a full with a warning on smaller bed types); allowSharing (boolean, default false; when true, members may buy into a second slot on this spot directly); reservedForHonoree (boolean). Occupancy is no longer stored as claimedByMemberId.

### SpotClaim

Replaces SleepSpot.claimedByMemberId. One row per occupant of a spot. Fields: id (string, PK); spotId (FK SleepSpot); memberId (FK TripMember); status (enum: pending \| approved). Unique on (spotId, memberId). A spot may have up to capacity claims in approved status (pending claims do not occupy a slot or enter W_P). Only approved claims count as occupancy and for pricing.

### SpotRequest

A member-initiated request to share a spot or switch spots. Used when allowSharing is off on the target, or when the member wants to switch, under bedChangePolicy = member_requests. Fields: id (string, PK); tripId (FK Trip); type (enum: share \| switch); fromSpotId (FK SleepSpot, nullable); toSpotId (FK SleepSpot); requesterMemberId (FK TripMember); counterpartMemberId (FK TripMember, nullable, for a share with a specific occupant); status (enum: pending \| approved \| denied \| cancelled); createdAt; resolvedAt (nullable); resolvedByMemberId (nullable). CostItem also has isLodging (boolean, default false). Exactly one cost item per trip should have isLodging true. When true, that item splits by SleepSpot weights (section 6.8), not evenly across P. Trip.minHeadcount (integer, payers) is the go / no-go floor and booking trigger; it replaces v1/v1.1's minimumCommitters (keep that name as a read alias). Trip also has maxHeadcount (integer, payers); bedChangePolicy (enum: member_requests \| locked, default member_requests); bookingConfirmation (string, nullable); actualLodgingTotal (money, nullable); and bookedAt (datetime, nullable).

### PrivateBudget

Visible only to that member. The organizer, other members, exports, and any API response served to a different member must not include maxAllIn, flexNote, mustHaves, or even whether a budget exists for a named person (beyond the anonymized badges in 6.12).

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| tripId | FK Trip |  |
| memberId | FK TripMember | Unique with tripId (one budget per member per trip) |
| maxAllIn | money | Dollars, all-in, including flights |
| flexNote | string, optional | Free text, still private |
| mustHaves | string\[\], optional | Multi-select: `golf`, `own_room`, `nightlife`, `other` |
| updatedAt | datetime |  |

Asked right after joining (S17), before voting. Skippable but nudged. Editable until that member's buy-in is paid; locked after buy-in.

### Milestone

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| tripId | FK Trip |  |
| name | string |  |
| kind | enum | `buy_in` or `custom` |
| dueDate | date, nullable | Buy-in due date is the commit deadline |
| amount | money, nullable | Fixed amount; null means "the remainder" |
| sortOrder | integer | Buy-in is always first |
| isNonRefundable | boolean | True for buy-in |

### Payment

| Field | Type | Notes |
| :---- | :---- | :---- |
| id | string | Primary key |
| tripId | FK Trip |  |
| memberId | FK TripMember |  |
| milestoneId | FK Milestone |  |
| amount | money |  |
| status | enum | `pending`, `paid`, `forfeited`, `cancelled`, `waived`, `refunded` |
| paidAt | datetime, nullable |  |
| isStub | boolean | Always true in this prototype |

### Relationships (summary)

- A Trip has many TripMembers, Polls, CostItems, SleepSpots, PrivateBudgets, and Milestones.  
- A Poll has many PollOptions; each option has many Votes; a member has at most one Vote per poll.  
- A Milestone has many Payments (one per paying member, plus waived/forfeited records as needed).  
- The honoree exclusion flag lives on Trip; the waived buy-in flag lives on TripMember. An optional CostItem has many CostItemParticipant rows (who opted in). A SleepSpot belongs to one Trip and has many SpotClaims (up to its capacity, only approved claims occupy a slot). reservedForHonoree defaults the best available spot to the honoree. A SpotRequest belongs to a Trip and involves one or two members and a target SleepSpot. A PrivateBudget belongs to one TripMember on one Trip and is never loaded into another member's session.

---

## 6\. Business rules (with worked examples)

**Paying set P:** TripMembers with status `committed`, `buyInWaived = false`, and not the excluded honoree. The honoree never counts toward `minHeadcount`.

**Member obligation:** For each person in P, total owed = (their rounded share of all active shared items, after forfeiture) + their share of optional items they opted into + their active individual items. The buy-in is **part of that total**, not an extra fee. Remaining due = total owed minus amounts already paid (and minus waived amounts).

**Shared, individual, or optional: A shared item is split across P. An individual item is owed only by the assigned member. An optional item (for example a tee time only some join) is split across the CostItemParticipant members who are also in P, not across all of P. If an opted-in member is dropped, they leave that item's split and it re-splits among remaining opted-in committers. If no opted-in committers remain, the item is flagged for the organizer and is not silently spread to the whole trip. If the honoree is excluded and has an individual item (for example their flight), that item is treated as shared among P. If the excluded honoree is opted into an optional item, their share is covered by the other opted-in paying participants.**

### 6.1 Cost-split formula

Items marked isLodging split by SleepSpot weight (section 6.8), not evenly across P.

For each other active shared item (including honoree-individual items reclassified as shared):

E_i = item.amount / \|P\|

For each active optional item: O_k,i = item.amount / \|P_item\|, where P_item is opted-in members who are also in P. A member i's raw total is T_i = L_i + sum of E_i + sum of O_k,i + F_i (individual items). Rounding (section 6.7) is applied to L_i + equal-shared + optional; then individual items are added. The buy-in is milestone 1 of T_i, not an extra fee.

### 6.2 Honoree exclusion

Default **on**. The honoree does not join P, is not asked for a buy-in, is not dropped at the deadline, and may still vote. If the organizer turns exclusion **off**, the honoree becomes a normal paying member and must buy in.

**Example A. Lodging (isLodging) is $2,400. Six friends have committed and claimed spots with weights 1.5, 1.25, 1.0, 0.8, 0.6, and 0.5 (see the seed in 7.1). The groom is excluded and holds the reserved 1.5 master; his weight is not in W_P.**

- P = 6\. W_P = 5.65. Chris (weight 1.5) pays lodging 2400 × 1.5 / 5.65 = $637.17 raw. The couch claimant (0.5) pays 2400 × 0.5 / 5.65 = $212.39 raw. Groom pays $0.  
- If exclusion were off and the groom also committed, his 1.5 weight joins W_P (W_P = 7.15). Chris's lodging becomes 2400 × 1.5 / 7.15 = $503.50 raw; the groom pays the same as Chris for the matching master-weight room. This is no longer an even $343 split.

### 6.3 Pre-deadline range estimate

Before the deadline, P is not final. My cost breakdown shows a range, not a fake-precise number.

- **Low end (more people):** compute T_i at Nmax using the forecast rules in 6.10. Nmax = maxHeadcount, but only if payer capacity (including expanded share slots) can support it. On the seed trip, base (unshared) capacity is 7 and expanded capacity is 8, which equals maxHeadcount.  
- **High end (fewer people): compute T_i at Nmin, where Nmin = max(minHeadcount, current \|P\|). Existing claims stay put; additional committers needed to reach Nmin take the highest-weight remaining unclaimed spots (next-to-commit picks first / best, not cheapest).**  
- Add that person's individual items, and their optional items, to both ends. New committers are not auto-opted into optional items, so optional amounts for current opt-ins stay fixed at the high and low ends when N only grows. The primary UI is the 6.10 forecast slider (share at each N from minHeadcount to maxHeadcount, plus live deltas and the expanded-headcount segment), not only a two-ended range. The buy-in is included in the all-in figure.

**Example B (seed trip, section 7.1). Equal-shared pool S_eq = $890 (activities $600 + Alex's flight $290). Lodging $2,400 splits by claimed weights (section 6.8). Tee times are optional ($480), already opted in by Chris, Sam, Jordan, and Drew — all four already committed. Four payers have committed (unofficial, below minHeadcount of 5). maxHeadcount is 8\. Base payer capacity is 7 (an air mattress was added); expanded capacity is 8 once Bedroom 3's queen is shared.**

- Official forecast (N = 5..8). Chris at N=5 is $1,278; N=6 is $1,186; N=7 (Casey takes the air mattress 0.5, W_P = 6.15) is $1,113; N=8 (expanded: Pat shares Sam's queen at 0.625 each) is $1,097.  
- Nmin = max(5, 4\) = 5\. Taylor would claim the sofa bed (0.6). Chris's all-in at N=5 is $1,278 (lodging 2400 × 1.5 / 5.15 = $699.03 raw + S_eq $178 + tee $120 + flight $280, rounded up).  
- Tee times stay $120 for the four already opted in; Chris's $280 flight is unchanged. His official forecast range is $1,097–$1,278 (N=8 to N=5), which already includes the $150 buy-in. His unofficial current figure at N=4 is $1,414 (flagged below-minimum). The slider also shows: if 1 more commits you save $136; if someone drops you pay +$283.

### 6.4 Deadline auto-drop and re-split

When `commitDeadline` is reached (or the organizer runs **Simulate deadline now**):

1. Every paying-eligible member still `invited` or `joined` becomes `dropped` (reason: `missed_deadline`). No charge.  
2. The honoree is not dropped.  
3. Recompute P from remaining `committed` paying members.  
4. Re-split all active shared items across the new P, and all optional items across remaining opted-in members in P, then refresh breakdowns and milestones.  
5. If \|P\| >= minHeadcount, trip → booking_ready (or stays booking_ready if it already got there early). If \|P\| < minHeadcount, trip → under_minimum. Buy-ins remain stub-refundable because the stay is not booked yet.

**Example C (seed trip).** At the deadline, Chris, Sam, Jordan, Drew, and Taylor have committed. Riley (`joined`, unpaid) and Casey (`invited`, unpaid) are auto-dropped. Alex the groom stays. Morgan already declined and is untouched.

- P = 5\. The trip moves to booking_ready (the booking threshold is met). W_P = 5.15 (Chris 1.5, Sam 1.25, Jordan 1.0, Drew 0.8, Taylor sofa 0.6). Official all-in, rounded up: Chris $1,278; Sam $1,191; Jordan $1,015; Drew $966; Taylor $728 (no tee). Remainder $3 on a $5,175 vendor total. Tee times stay $120 for the four who opted in.  
- The pre-deadline range collapses to the official N=5 numbers. The sensitivity table still shows Chris saving $92 if Riley also commits (N=6, Chris $1,186).

### 6.5 Under-minimum handling

If \|P\| < minHeadcount after the deadline:

- Trip status = `under_minimum`. Shares are not official. Milestone collection is blocked.  
- Organizer must either cancel the trip (already-paid buy-ins are stub-refunded — the stay was never booked) or explicitly lower the minimum to the current \|P\|, with a warning that per-person cost will rise, then move the trip to booking_ready.

**Example D. Same lodging $2,400 and S_eq $890, minimum 5, but only Chris, Sam, and Jordan commit (weights 1.5, 1.25, 1.0; W_P = 3.75). All three opted into tee times; Drew, who had opted in, did not buy in. Trip → under_minimum (3 of 5).**

- If Chris cancels: three $150 buy-ins are marked `refunded` (stub).  
- If Chris lowers the minimum to 3, the trip moves to booking_ready. Lodging: Chris 2400 × 1.5 / 3.75 = $960; Sam $800; Jordan $640. S_eq = 890 / 3 = $296.67. Tee times re-split 480 / 3 = $160. Official all-in, rounded up: Chris $1,697; Sam $1,567; Jordan $1,347. Remainder $1 on a $4,610 vendor total.

### 6.6 Forfeiture on late drop

A late drop is any move from committed to dropped (member-initiated or organizer-removed) after the trip is booked. Before booked, a drop stub-refunds the buy-in, frees the SleepSpot, and re-prices; it is not a forfeiture.

- Buy-in Payment → forfeited. It is not returned. It stays in the trip pot and reduces the lodging (isLodging) amount first, not optional items. If the forfeited amount exceeds lodging, the leftover reduces equal-shared items next.  
- The dropped member's unpaid future milestones → `cancelled`. They owe nothing more.  
- Their individual CostItems become inactive (removed from the pool). If they were opted into an optional item, they are removed from that item's participants and the item re-splits.  
- Recompute P, free the dropped member's SleepSpot, and re-price. If the trip was booked and \|P\| now sits under the minimum, trip → under_minimum (forfeiture already applied).  
- The dropped member sees S10 with the forfeiture explanation.

Decline or miss-deadline before paying is **not** a forfeiture (no money moved).

**Example E. Trip is booked with P = 5 (the N=5 happy path in Example C). Tee times $480 among four (not Taylor). Each person has paid the $150 buy-in. Taylor late-drops.**

- Taylor's $150 is forfeited and applied to lodging first, not to optional tee times. New lodging amount = 2400 − 150 = $2,250. W_P falls to 4.55 as the sofa bed is freed.  
- New P = 4\. Official all-in, rounded up: Chris $1,365; Sam $1,271; Jordan $1,088; Drew $1,034. Remainder $3 on a $4,755 vendor total (lodging $2,250 + S_eq $890 + tee $480 + remaining flights $1,135). Tee times stay $120. (If Drew had late-dropped instead, tee times would re-split 480 / 3 = $160 among the remaining three, and Drew's bunk would be freed.)  
- Pot already holds 5 × $150 = $750 (including Taylor's forfeiture). Remaining to collect from the four is their new rounded all-in minus the $150 they already paid (Chris $1,215 more, and so on).  
- Taylor is owed nothing.

### 6.7 Rounding

**Rule:** After forfeiture is applied, each paying member's **shared total** is rounded **up to the next whole dollar** (amounts that are already whole dollars stay as they are). Individual items are not rounded. The sum of rounded shared totals may exceed the shared pool by a few dollars; that **remainder is kept in the trip pot and noted on the cost sheet** (visible to the organizer; useful for tips or fees; later products can refund it). This is how the organizer "keeps" a remainder. If a future change used residual math instead, the organizer might "absorb" a slightly different personal share — the sheet must always show the adjustment line so the total is reconcilable.

**Example F.** Shared total $2,900. P = 6\. Raw share = 2900 / 6 = $483.333.

- Each of the six members is charged **$484**. 6 × $484 = $2,904.  
- Rounding remainder = **$4**, kept in the trip pot and noted on the sheet.

**Example F2 (seed).** At N=6, vendor total = lodging $2,400 + S_eq $890 + tee $480 + six paying flights $1,705 = $5,475. Rounded all-in sums to $5,479 (Chris $1,186, Sam $1,110, Jordan $944, Drew $904, Taylor $674, Riley $661). Remainder = $4.

At N=7 (Casey on the air mattress, flight $285), vendor = $5,760 and rounded all-in sums to $5,764 (remainder $4). At N=8 (Pat shares Sam's queen, flight estimate $280), vendor = $6,040 and rounded all-in sums to $6,045 (remainder $5). Remainders are kept in the trip pot and noted on the sheet.

---

### 6.8 Room-tiered lodging pricing

The organizer defines SleepSpots for the rental (S13) and may add any bed type at any time. Default weights, all editable: king or queen in a private room with a private bath, 1.5; king or queen in a private room with a shared bath, 1.25; full, or any bed in a shared room, 1.0; twin or bunk, 0.8; sofa bed, 0.6; couch or air mattress, 0.5.

A SleepSpot has capacity (1 or 2\) and allowSharing. Capacity 2 is offered for king or queen; the organizer can set capacity 2 on a full with a warning, and should be warned before setting it on a smaller bed type. Two guys can share a king or queen.

Occupancy is stored as SpotClaim(spotId, memberId, status pending\|approved), not as claimedByMemberId. Only approved claims occupy a slot, enter pricing, and count toward capacity used. Pending claims do not.

Sharing happens in two ways: If allowSharing is true on the spot and bedChangePolicy is member_requests, a member may buy into an open slot directly (SpotClaim is approved immediately). If allowSharing is false, or the member wants to join a spot that is not pre-enabled, they submit a SpotRequest (type share). The organizer approves or denies it on S16. Approval writes the approved SpotClaim. If bedChangePolicy is locked, only the organizer assigns the second slot, from S13.

Pricing. Occupants of a shared spot split that spot's weight evenly. A 1.25 queen with two approved occupants means 0.625 each. The organizer can edit the underlying spot weight. A solo occupant of a shareable spot pays the full weight until a second claim is approved.

Let w_i be paying member i's effective weight (spot.weight / number of approved occupants on that spot). W_P is the sum of the weights of spots occupied by payers, which is the same as the sum of effective weights of members in P. A reserved honoree-only spot is omitted from W_P. If a payer later shares with the honoree, only the payer's half of that spot weight sits in W_P; the honoree's half is gifted as in v1.1.

L_i = S_lodge × w_i / W_P

Unclaimed spots carry no cost; the total re-splits across occupied payer spots. A member who drops frees their claim and everything re-prices. If they were one of two on a shared spot, the remaining occupant returns to the full spot weight.

Capacity rule. Payer capacity = the sum of capacity on spots that are not reservedForHonoree. This must be >= maxHeadcount; S13 warns the organizer otherwise. A buy-in with no free slot — no vacant spot and no open share slot the member can take immediately — is blocked until the organizer adds a spot or approves a share.

Claim order: members pick in buy-in order (first to commit picks first). The organizer can override, assign, or swap any claim. While buy-in is open (and during booking_ready, until booked), every spot shows a live price, including the per-person price of an open shared slot: the price it would be if claimed now with the post-share effective weights. After a member commits they are sent to the spot picker (S14).

The best unreserved spot is reservedForHonoree by default when honoree exclusion is on ("we gift the groom the best room").

### 6.9 Commit-then-book threshold

minHeadcount (alias of v1's minimumCommitters) is both the trip's go / no-go floor and the booking trigger. When \|P\| reaches minHeadcount (even before the deadline), the trip moves to booking_ready. At the deadline, unpaid invited/joined paying members are auto-dropped and the trip branches to booking_ready or under_minimum as in 6.4.

In booking_ready, more people may still buy in until the organizer books, occupancy is full, or \|P\| would exceed maxHeadcount. A buy-in that has no free slot is blocked, as in 6.8. The organizer books the stay on S15 by entering a confirmation number and the actual lodging total (stubbed). Submitting Book stay drops anyone who has not committed, closes buy-in, writes bookedAt, and moves the trip to booked. The UI must warn that booking closes buy-in and drops unpaid members.

If the organizer enters an actualLodgingTotal that differs from the estimate, S_lodge updates and shares rebase immediately (section 6.10).

Buy-ins are stub-refundable until booked and are forfeited only after booked (section 6.6). This replaces v1's locked_in wording, which treated the buy-in as locked at the deadline.

If someone drops during booking_ready and \|P\| falls below minHeadcount, the trip returns to buy_in_open (or to under_minimum if the deadline has already passed). Their buy-in is stub-refunded.

### 6.10 Cost forecast across headcount

Everywhere a member sees their number (S3, S8, S9, S14), show a sliding scale or slider of their all-in cost at every N from minHeadcount to maxHeadcount, plus live deltas at the current N. When the member has a flight range, the slider draws a band (low estimate to high estimate) at each N, and any single "your number" is shown as a range. Midpoint (`amount`) is used only for milestone totals until a fare is confirmed.

Deltas at the current N: if 1 more commits you save $X, where X = round_up(T_i(current)) − round_up(T_i(current+1)) if someone drops you pay +$Y, where Y = round_up(T_i(current−1)) − round_up(T_i(current)) If current−1 would sit under minHeadcount, still show +$Y but flag that the trip would fall under_minimum (or leave booking_ready).

The forecast is built from the lodging estimate (or actualLodgingTotal once entered), prospective flight estimates (individual items, entered by the organizer or the member; if missing, treat as $0 and flag "no flight estimate"), equal-shared items, optional items the member has opted into, and any other trip elements.

The organizer sees the whole-trip version on S3 and S7: each committed or prospective payer's share at each N, plus the trip total and remainder.

Computing T_i(N). Existing approved claims stay sticky. Additional committers fill vacant spots first, taking the highest-weight remaining unclaimed spots (the next person to commit picks first and takes the best remaining bed, not the cheapest). New committers are not auto-opted into optional items. Equal-shared items use S_eq / N. Lodging uses L_i(N) = S_lodge × w_i / W_P(N) with the effective weights in 6.8. Then T_i(N) = L_i(N) + S_eq / N + optional + individual, and the displayed figure is rounded up per 6.7.

Expanded headcount. Once vacant spots are full, further N uses open share slots (allowSharing spots, and organizer-approved shares). Show this part of the slider as an "expanded headcount" scenario, visually distinct, because shared beds are what raise capacity to maxHeadcount. On the seed trip, base payer capacity (no sharing) is 7; sharing Bedroom 3's queen raises capacity to 8, which equals maxHeadcount.

Drops in the forecast use the most recently committed other payer (last in, first out), not the person looking at the screen.

When the organizer enters an actual lodging total on Book stay (S15), shares rebase immediately. Each guy sees his previous all-in, his new all-in, and the slider rerun from minHeadcount to maxHeadcount using the actual total as S_lodge. On the seed trip at official N=5, if the actual total is $2,640 (vs. the $2,400 estimate), Chris moves from $1,278 to $1,347; Sam $1,191 to $1,249; Jordan $1,015 to $1,061; Drew $966 to $1,004; Taylor $728 to $756. Remainder $2 on a $5,415 vendor total.

On the seed trip, with Chris holding the 1.5 queen-and-private-bath, the official forecast (N = 5..8, estimate $2,400) is $1,278, $1,186, $1,113, $1,097. Unofficial current N=4 is $1,414 (flagged below-minimum). If 1 more commits he saves $136; if someone drops he pays +$283. At N=8, Pat shares Sam's 1.25 queen (0.625 each): Sam falls from $1,045 at N=7 to $786, which is the worked share example.

### 6.11 Bed change policy

Trip.bedChangePolicy has two modes, toggled by the organizer in settings (S12): member_requests (default). Any member can request to switch or share from S14. The organizer approves or denies on S16. Buying into an open allowSharing slot is direct (no request). locked. Only the organizer can move people, from S13. The request form on S14 is hidden. The S16 queue will not receive new member requests.

Toggling the policy does not unwind already-approved claims. Pending requests stay until the organizer resolves them or the requester cancels.

After the trip is booked, every bed change requires organizer approval — even if the policy is still member_requests and the spot is allowSharing — and prices rebase immediately. S13 and S16 warn that a move will change everyone's numbers.

### 6.12 Private budgets and group feasibility

The problem this solves: guys say yes in the group chat and bail quietly because nobody wants to say "I can't afford Cabo." A budget in this product is a private planning input, not a public commitment, and it never blocks a vote or a buy-in. It is advisory.

**Privacy rule (normative, testable).** No screen, API response, or export prepared for member A may include member B's maxAllIn, flexNote, mustHaves, or a flag that B is over or under a given option. The organizer is not an exception. The only group-visible output is the anonymized badge in this section. Store access and query logs must follow the same rule.

**When it is collected.** S17 is shown immediately after a member joins and before they reach the polls. It is skippable but nudged. The member can edit the budget until their buy-in is paid; after buy-in it is locked (they can still see it).

**Group feasibility**, computed independently for each Destination and Dates poll option that has a lodgingEstimate:

1. Let B be the set of paying-eligible members (not the excluded honoree, not declined or dropped) who have a saved budget and a high flight estimate for this option (or a trip-level high they have entered). Skipped budgets are excluded. Members missing a high flight estimate are also excluded, so a missing fare cannot make an option look cheaper than it is.  
     
2. Let N_ref = minHeadcount. Lodging is split with the usual forecast rules at N_ref (existing claims sticky; additional committers fill highest-weight vacant spots first). Let W_P(N_ref) be that denominator.  
     
3. Let w_med be the median of the defined payer SleepSpot weights on the trip (seed: 0.8, the bunk). This is a representative bed, not the viewer's claimed bed, so the group badge is comparable across members.  
     
4. For each member i in B, the conservative all-in used for the badge is:  
     
   G_i = round_up(S_lodge_option × w_med / W_P(N_ref) + S_eq / N_ref + i's high flight estimate for that option)  
     
   Optional items (tee times, etc.) are excluded from G_i, even if i marked a mustHave. MustHaves affect only the private suggestion line, below.  
     
5. Let F = the number of members in B for whom G_i ≤ maxAllIn_i.  
     
6. Badge:  
     
   - "Fits everyone" if F = \|B\| and \|B\| ≥ 1  
   - "Fits most" if F ≥ minHeadcount and F < \|B\|  
   - "Over budget for the group" if F < minHeadcount

   

7. Display limits:  
     
   - Never show who is over, or an exact over-count.  
   - If \|B\| < 6, still show the badge, but do not show any supporting count that could identify a person (no "one person is over," no initials).  
   - Show "based on N budgets" only when N = \|B\| ≥ 4\.  
   - If \|B\| = 0, show no badge ("Add a budget to see whether this fits").

The organizer may hide options badged "Over budget for the group" before voting opens. Hidden options are removed from the member vote list; the organizer can unhide them. Hiding is not automatic.

**Personal fit** (private to the viewing member, on S5, only if they have a budget):

- "You're $X under" or "You're $X over", where X = \|maxAllIn − G_you\| and G_you uses the same median-weight, minHeadcount, high-flight formula as the badge.  
- If they are over, also suggest cheaper beds using the same N_ref and S_lodge, swapping only w: the couch (0.5 on the seed) and a shared queen (0.625 on the seed, Bedroom 3). Quote the dollars under if a bed gets them under; if even the cheapest bed is over, say so. If a suggestion conflicts with a mustHave (for example `own_room` vs. the couch), still show the dollars and flag the conflict ("this gives up your own room").

**Worked seed example (destination poll).** Six paying members have budgets (Chris, Sam, Jordan, Drew, Taylor, Riley). Casey skipped; Alex is the excluded honoree. minHeadcount = 5\. Payer-spot weights \[1.5, 1.25, 1.0, 0.8, 0.6, 0.5, 0.5\], so w_med = 0.8. At N_ref = 5, W_P = 5.15 (Chris 1.5, Sam 1.25, Jordan 1.0, Drew 0.8, Taylor sofa 0.6). S_eq = $890, so E = $178. G_i uses high flight estimates in the seed flight table below.

Scottsdale (lodgingEstimate $2,000):

- L_med = 2000 × 0.8 / 5.15 = $310.68  
- G_i = round_up(310.68 + 178 + flight_high) = round_up(488.68 + flight_high)  
- Chris $799, Sam $839, Jordan $779, Drew $809, Taylor $769, Riley $819 — all under their budgets.  
- Badge: **Fits everyone**, based on 6 budgets.

Cabo (lodgingEstimate $4,200):

- L_med = 4200 × 0.8 / 5.15 = $652.43  
- G_i = round_up(652.43 + 178 + flight_high) = round_up(830.43 + flight_high)  
- Chris $1,531 (budget $2,000, under $469); Sam $1,551 (budget $1,800, under $249); Jordan $1,411 (budget $1,500, under $89); Drew $1,481 (budget $1,400, **over $81**); Taylor $1,191 (budget $1,300, under $109); Riley $1,471 (budget $1,600, under $129).  
- F = 5 of 6, and 5 ≥ minHeadcount, so the badge is **Fits most**, based on 6 budgets. Nobody is named.

**Drew's private line on Cabo.** He sees "You're $81 over" at the median bed. Alternatives at the same N_ref and high fare ($650):

- Couch (0.5): L = 4200 × 0.5 / 5.15 = $407.77; G = round_up(407.77 + 178 + 650\) = $1,236; **under by $164**.  
- Shared queen (0.625): L = 4200 × 0.625 / 5.15 = $509.71; G = round_up(509.71 + 178 + 650\) = $1,338; **under by $62**.

Copy: "You're $81 over. A couch gets you under by $164; a shared queen gets you under by $62." Nashville (the $2,400 seed lodging, Drew's high fare $340) is under for everyone who has a budget, including Drew (G = round_up(372.82 + 178 + 340\) = $891, under $509).

### 6.13 Per-person flight ranges

Individual flight CostItems (and, during voting, the flight estimates used for 6.12) have `homeAirport`, `lowEstimate`, and `highEstimate`. Entry is manual in this MVP; a flight API is later work and is out of scope.

- `amount` is the midpoint and must stay consistent with (low + high) / 2 when both ends are set. Seed midpoints are unchanged from v1.2 (Chris $280, Sam $310, and so on) for the leading destination, Nashville.  
- Every per-person number that includes a flight is displayed as a range: recompute T with the low fare and with the high fare, then round each end up per 6.7. Example: at official N=5 Nashville, Chris's midpoint all-in is $1,278; the range is $1,248–$1,308 (flight $250–$310).  
- The forecast slider (6.10) draws a band at each N between those two rounded ends.  
- Group feasibility (6.12) always uses the high estimate.  
- Milestones and stub payments use the midpoint until a fare is confirmed, at which point low = high = actual and the range collapses.  
- Destination-specific highs and lows used for poll badges live on the same member's flight estimates, keyed by poll option, in the seed table in 7.1. If a member has no high estimate for an option, they are omitted from that option's group badge (6.12 step 1).

## 7\. Build vs. stub

### 7.1 Seed data (build this; do not require Jeremy to type it in)

**Trip:** "Alex's Bachelor Party" **Type:** bachelor_party **Status:** `buy_in_open` **Invite code:** `ALEX2027` **Buy-in:** $150 **Commit deadline:** December 15, 2026, 11:59 PM America/Chicago **minHeadcount: 5 (payers)** **maxHeadcount: 8 (payers)** **bedChangePolicy: member_requests** **Honoree excluded:** on

**Roster**

| Name | Role | Status | Notes |
| :---- | :---- | :---- | :---- |
| Chris | organizer | committed | Would otherwise have fronted the Airbnb. ORD. Nashville flight $250–$310 (mid $280). Private budget $2,000. |
| Alex | honoree | committed | Buy-in waived. Flight $250–$330 (mid $290) treated as shared. Can vote. No budget required. |
| Sam | member | committed | DEN. Nashville flight $270–$350 (mid $310). Private budget $1,800. |
| Jordan | member | committed | ATL. Nashville flight $210–$290 (mid $250). Private budget $1,500. |
| Drew | member | committed | DTW. Nashville flight $250–$340 (mid $295). Private budget $1,400. On Cabo he is privately over at the median bed; a couch gets him under. |
| Taylor | member | joined | IAH. Nashville flight $230–$310 (mid $270). Private budget $1,300. Will drop in the Example C path if deadline is simulated before they pay. |
| Riley | member | joined | CLT. Nashville flight $260–$340 (mid $300). Private budget $1,600. |
| Casey | member | invited | MSP. Nashville prospective flight $250–$320 (mid $285). Budget skipped. |
| Morgan | member | declined | Declined before paying. No budget. |

Prospective 8th payer, not yet invited: **Pat**, flight estimate $280. Used in the N=8 expanded-headcount forecast only.

**Polls (all open, with a current leader)**

- Destination: Nashville (leading, lodgingEstimate $2,400, **Fits everyone**), Austin (lodgingEstimate $2,200, **Fits everyone**), Scottsdale (lodgingEstimate $2,000, **Fits everyone**), Cabo (lodgingEstimate $4,200, **Fits most**). Worked badge math is in 6.12.  
- Dates: May 14–17, 2027 (leading) vs. May 21–24, 2027\.  
- Activities: Brewery day, golf / tee times, dinner and a show.

**Private budgets (never shown in a group or organizer UI):** Chris $2,000; Sam $1,800; Jordan $1,500; Drew $1,400; Taylor $1,300; Riley $1,600. Casey skipped. Six budgets, so badges may say "based on 6 budgets."

**Flight estimates by destination (manual, stubbed).** Nashville midpoints match the v1.2 cost-sheet flights. Group feasibility uses the High column.

| Member | Home | Nashville low–mid–high | Scottsdale high | Cabo high |
| :---- | :---- | :---- | :---- | :---- |
| Chris | ORD | $250–$280–$310 | $310 | $700 |
| Sam | DEN | $270–$310–$350 | $350 | $720 |
| Jordan | ATL | $210–$250–$290 | $290 | $580 |
| Drew | DTW | $250–$295–$340 | $320 | $650 |
| Taylor | IAH | $230–$270–$310 | $280 | $360 |
| Riley | CLT | $260–$300–$340 | $330 | $640 |
| Casey | MSP | $250–$285–$320 | $320 | $600 |
| Pat | PHL | $240–$280–$320 | $320 | $620 |
| Alex (shared) | — | $250–$290–$330 | $330 | $650 |

At official N=5 Nashville, Chris's displayed all-in is the range **$1,248–$1,308** around the $1,278 midpoint.

**Cost sheet (published)**

| Item | Category | Split | Amount |
| :---- | :---- | :---- | :---- |
| Airbnb — 4 nights | lodging | isLodging (weighted) | $2,400 |
| House activities fund | activities | shared | $600 |
| Tee times | tee_times | optional | $480 |
| Alex's flight (group covers) | flights | individual → treated as shared | $290 |
| Each other person's flight | flights | individual | see roster |

Equal-shared pool S_eq = 600 + 290 = $890. Airbnb $2,400 is the isLodging item and splits by SleepSpot weight. Optional tee times = $480, split among Chris, Sam, Jordan, and Drew ($120 each).

**Milestones: (1) Buy-in $150, due Dec 15, 2026, stub-refundable until booked and forfeited only after booked; (2) Lodging $400, due January 15, 2027; (3) Balance = remainder, due April 1, 2027\.**

Sleeping spots (8 spots; payer capacity 7 unshared, 8 with Bedroom 3 shared) Commit / claim order: Alex holds the reserved master (SpotClaim approved). Chris (first to commit) took Bedroom 2, then Sam, Jordan, and Drew — all approved SpotClaims. The sofa, couch, and air mattress are unclaimed. Bedroom 3 (Sam's queen) has allowSharing = true and an open second slot. Current W_P = 1.5 + 1.25 + 1.0 + 0.8 = 4.55. bedChangePolicy = member_requests. Casey's prospective flight is $285; Pat is a prospective 8th payer, not yet invited, flight estimate $280.

1. Master suite — king, private room, private bath, weight 1.5, reservedForHonoree, claimed by Alex.  
2. Bedroom 2 — queen, private room, private bath, weight 1.5, claimed by Chris.  
3. Bedroom 3 — queen, private room, shared bath, weight 1.25, capacity 2, allowSharing true, approved claim: Sam (open share slot).  
4. Bedroom 4 — full, private room, shared bath, weight 1.0, claimed by Jordan.  
5. Bunk room — bunk, shared room, weight 0.8, claimed by Drew.  
6. Loft — sofa_bed, weight 0.6, unclaimed (Taylor would pick this next).  
7. Living room — couch, weight 0.5, unclaimed (Riley would pick this at N=6).  
8. Living room — air_mattress, weight 0.5, unclaimed (Casey would pick this at N=7; added so payer capacity can reach maxHeadcount 8 once the queen is shared).

Worked lodging math (S_lodge = $2,400; S_eq = $890; tee $120 for Chris, Sam, Jordan, and Drew only; each person's flight is individual): N=4 (current, below min, unofficial). W_P = 4.55. Rounded all-in: Chris $1,414; Sam $1,312; Jordan $1,120; Drew $1,060. Remainder $1 on vendor $4,905. N=5 (Taylor claims the sofa 0.6; W_P = 5.15; booking threshold). Chris $1,278; Sam $1,191; Jordan $1,015; Drew $966; Taylor $728. Remainder $3 on vendor $5,175. N=6 (Riley claims the couch 0.5; W_P = 5.65). Chris $1,186; Sam $1,110; Jordan $944; Drew $904; Taylor $674; Riley $661. Remainder $4 on vendor $5,475. N=7 (Casey claims the air mattress 0.5, flight $285; W_P = 6.15). Chris $1,113; Sam $1,045; Jordan $888; Drew $855; Taylor $632; Riley $623; Casey $608. Remainder $4 on vendor $5,760. N=8, expanded headcount (Pat shares Sam's 1.25 queen, 0.625 each, flight estimate $280; W_P stays 6.15). Chris $1,097; Sam $786; Jordan $872; Drew $839; Taylor $616; Riley $607; Casey $592; Pat $636. Remainder $5 on vendor $6,040. Sharing is what drops Sam from $1,045 to $786. Worked mid-path share (not the default forecast path): if at N=5 Taylor shared Sam's queen instead of taking the sofa, W_P stays 4.55 and all-in would be Chris $1,370; Sam $938; Jordan $1,076; Drew $1,015; Taylor $778. Remainder $2 on vendor $5,175. The default forecast instead fills vacant spots first, then uses the share slot at N=8. After booked at N=5, if the organizer enters actualLodgingTotal $2,640, shares rebase immediately (W_P = 5.15): Chris $1,347 (was $1,278); Sam $1,249 (was $1,191); Jordan $1,061 (was $1,015); Drew $1,004 (was $966); Taylor $756 (was $728). Remainder $2 on vendor $5,415. The min-to-max forecast reruns on $2,640. After booked, Taylor late-drops (Example E, using the $2,400 estimate if actual was never changed): lodging $2,250, W_P = 4.55. Chris $1,365; Sam $1,271; Jordan $1,088; Drew $1,034. Remainder $3 on vendor $4,755.

Also include a clean empty state so an organizer can create a second trip from scratch.

### 7.2 Build in the prototype

- All seventeen screens (S1–S17), navigable and state-driven, including sleeping-spot setup, the spot picker, Book stay, the approvals queue, and private budget entry.  
- Trip create, invite code/link join, user switcher across seed personas.  
- Roles: organizer, member, honoree.  
- Polls (destination, dates, activities): options, vote, change vote, lock, tie handling.  
- Cost sheet editor and member breakdown.  
- Split math: honoree exclusion, room-tiered lodging (SleepSpot weights and shared-bed effective weights), SpotClaim / SpotRequest, capacity vs. maxHeadcount, optional/opt-in items (CostItemParticipant), min-to-max cost forecast with expanded-headcount sharing, immediate rebase when actual lodging is entered, pre-deadline range, deadline auto-drop and re-price, commit-then-book (booking_ready → booked), under-minimum, late-drop forfeiture after booked, rounding remainder.  
- Bed change policy toggle (member_requests vs. locked) on S12, request UI on S14, and organizer approvals queue (S16).  
- Buy-in flow with refundable-until-booked acknowledgment (writes a stub Payment); stub refund if the member drops before booked.  
- Milestone grid with stub Pay.  
- Private budgets (S17), anonymized poll badges, private under/over lines and cheaper-bed suggestions, organizer hide of over-budget options, and the privacy rule in 6.12.  
- Flight low/high estimates and home airports; all-in figures and the forecast slider shown as ranges/bands; group feasibility using the high estimate.  
- Off-the-trip state and organizer settings, including **Simulate deadline now**.  
- Seed trip above.

### 7.3 Stub

- **Auth:** persona switcher / display name only. No Google, Apple, or email magic link.  
- **Payments:** no Stripe and no card fields. A button marks the Payment `paid` and shows a fake confirmation. Every pay surface says "Test payment — no card charged."  
- **Notifications:** no SMS or email. In-app banners are enough; an optional "would have notified" log is fine.  
- **Invite delivery:** generate the link and code; do not send texts.  
- **Bookings and fares:** no Airbnb, flight, or tee-time integrations. S15 is stubbed: the organizer enters a confirmation number and the actual lodging total, which moves the trip to booked. Flight low/high amounts are typed in, not looked up.  
- **Realtime:** one browser with the user switcher is enough; a refresh may be required to see another persona's change.  
- **Uploads, production auth, public deploy, custom domain.** Do not publish without Jeremy's OK.

Stripe test mode is **not** in this prototype. Same user-visible behavior as a fake charge, with no payment-provider integration. Real escrow via Stripe Connect is later work.

---

## 8\. Out of scope / later

- Golf trip and camping templates, and any trip type other than bachelor party.  
- Trip-idea feed ("get guys together more often").  
- Real escrow via Stripe Connect, Stripe test mode, or any live payments; paying the Airbnb or host so the organizer does not front the lodging card (money-transmitter, escrow, and chargeback risk).  
- Booking integrations (Airbnb, flights, tee times, restaurants).  
- Group chat or comment threads.  
- Native mobile apps.  
- Real accounts and email / SMS / push notifications.  
- Multi-currency; payment plans beyond milestones.  
- Rejoin-after-deadline, waitlists.  
- Public launch, paid sign-ups, custom domain.

---

## 9\. Open questions for Jeremy

The v1.1 questions were resolved in v1.2. Defaults that would matter for private budgets and flight ranges are stated in 6.12–6.13: feasibility is advisory (it never blocks a vote or a buy-in); it uses minHeadcount, the median-weight spot, and each member's high flight estimate; optional items stay out of the group badge; missing budgets and missing high fares are omitted from the badge set.

No new open questions.

---

## 10\. Acceptance criteria for the prototype

Testable checklist. All payment steps are stubbed; none may charge a real card.

- [ ] Clickable prototype covers all seventeen screens (S1–S17), including private budget entry. No real money, no paid sign-up, and it is not published without Jeremy's OK.  
- [ ] Seed trip "Alex's Bachelor Party" (invite code ALEX2027) loads with the roster, polls, cost sheet, 8 SleepSpots (Bedroom 3 queen allowSharing, plus an air mattress), isLodging Airbnb $2,400, S_eq $890, $480 optional tee times (Chris, Sam, Jordan, Drew), $150 buy-in, minHeadcount 5, maxHeadcount 8, bedChangePolicy member_requests, and statuses in section 7.1. Current unofficial N=4 all-in: Chris $1,414, Sam $1,312, Jordan $1,120, Drew $1,060. Casey's prospective flight is $285; Pat is a prospective 8th payer at $280.  
- [ ] Organizer defines SleepSpots on S13 with default weights, capacity, and allowSharing, and can add any bed type at any time. S13 warns if payer capacity < maxHeadcount. The best spot is reservedForHonoree when exclusion is on. After buy-in, the member picks a remaining spot on S14 in commit order, with a live price on every spot (including a shared-slot price). Unclaimed spots carry no cost. A dashboard room badge shows the claimed room. Book stay (S15) requires a confirmation number and actual lodging total, warns that buy-in will close and unpaid members will be dropped, then moves the trip to booked. If the actual total differs, shares rebase immediately and each member sees old vs. new plus an updated min-to-max forecast.  
- [ ] A new organizer can create a bachelor party trip, set buy-in, deadline, minHeadcount, and maxHeadcount, leave honoree exclusion on (the default), set bedChangePolicy, and get an invite code or link. A newly joined member is taken to S17 before the polls, can skip, and can edit the budget until buy-in.  
- [ ] A second seed persona can join via that code and appears on the roster as `joined`.  
- [ ] Members can vote and change votes on Destination, Dates, and Activities until the organizer locks the poll. After lock, votes cannot change, and the winning option appears on Trip home.  
- [ ] A tied poll cannot be locked until the organizer picks a winner.  
- [ ] The cost sheet supports shared, individual, and optional line items in categories lodging, flights, activities, tee_times, and other, plus exactly one isLodging item that splits by SleepSpot weight. Optional items (seed: tee times) split only among opted-in members; Taylor's breakdown does not include tee times unless he opts in.  
- [ ] My cost breakdown itemizes weighted lodging + equal-shared + optional items the member opted into + individual items, shows buy-in as part of the total, and lists remaining milestones.  
- [ ] Before the deadline (and during booking_ready), the breakdown shows a min-to-max forecast slider (N = minHeadcount..maxHeadcount) per 6.10, including the expanded-headcount segment once sharing raises capacity. On the seed trip, Chris's official forecast is $1,278 / $1,186 / $1,113 / $1,097 at N=5..8; his unofficial N=4 figure is $1,414; if 1 more commits he saves $136; if someone drops he pays +$283.  
- [ ] With honoree exclusion on, Alex is not in P, his $290 flight is treated as shared, he is not dropped at the deadline, and he pays $0.  
- [ ] Buy-in requires an explicit acknowledgment that the payment is stub-refundable until booked and forfeited only after booked. Confirm creates a stub Payment, sets status committed, and sends the member to the spot picker (S14). No card is charged. The organizer must also complete this buy-in.  
- [ ] "Simulate deadline now" (or the real deadline) auto-drops unpaid invited/joined paying members, does not drop the honoree, re-prices lodging by claimed weights and equal-shared/optional items, and updates breakdowns. If Taylor first completes the stub buy-in and then the deadline is simulated, Riley and Casey drop, the trip is booking_ready with P = 5, official all-in is Chris $1,278 / Sam $1,191 / Jordan $1,015 / Drew $966 / Taylor $728, and tee times stay $120 for the four who opted in. If the deadline is simulated on the seed as loaded (Taylor still unpaid), P = 4 and the trip goes to under_minimum. If Taylor buys in before the deadline, the trip moves to booking_ready immediately, without waiting for the deadline.  
- [ ] If remaining P is under the minimum, the trip goes to under_minimum and milestone collection is blocked until the organizer cancels (stub-refund buy-ins, because the stay was never booked) or explicitly lowers the minimum and moves the trip to booking_ready.  
- [ ] A late drop after booked forfeits their buy-in, cancels their unpaid milestones, reduces lodging first (not optional items), frees their SleepSpot, re-prices among remaining P, and shows them S10. Example E is reproducible: Taylor drops, remaining all-in is Chris $1,365 / Sam $1,271 / Jordan $1,088 / Drew $1,034, and tee times stay $120 for the four opted in. A drop before booked is stub-refunded, not forfeited.  
- [ ] Rounding: each paying member's shared total rounds up to the next dollar; any remainder is kept in the trip pot and noted on the sheet. Example F is reproducible: $2,900 / 6 → $484 each, $4 remainder noted.  
- [ ] The payment grid shows each paying member versus each milestone with paid / due / upcoming / waived / forfeited / refunded, and a stub Pay action works for a due cell.  
- [ ] Off-the-trip users cannot vote or pay and see the explanation on S10.  
- [ ] The user switcher can jump between Chris, Alex, a committed friend, Taylor (or a dropped persona), and an invited persona to demo each path.  
- [ ] Every pay surface states that payments are simulated and no real money moves.  
- [ ] A buy-in with no free slot is blocked until the organizer adds a SleepSpot or approves a share. On the seed trip, after vacant spots are filled (N=7), the 8th payer (Pat) can only join by sharing Bedroom 3's queen (or after another spot is added).  
- [ ] Shared-bed pricing is reproducible: at N=8, Sam and Pat each have effective weight 0.625 on the 1.25 queen, W_P stays 6.15, and official all-in is Chris $1,097 / Sam $786 / Jordan $872 / Drew $839 / Taylor $616 / Riley $607 / Casey $592 / Pat $636 (remainder $5 on vendor $6,040).  
- [ ] Rebase is reproducible: at booked N=5, actualLodgingTotal $2,640 moves Chris from $1,278 to $1,347, Sam $1,191 to $1,249, Jordan $1,015 to $1,061, Drew $966 to $1,004, Taylor $728 to $756 (remainder $2 on vendor $5,415), and the forecast slider reruns on $2,640.  
- [ ] Under bedChangePolicy = member_requests, a member can request a share or switch on S14 and the organizer can approve or deny it on S16. Toggling to locked hides the request form and leaves approved claims in place. After booked, every bed change requires organizer approval and rebases prices.  
- [ ] **Privacy:** Switching to Chris, then to Drew, then back, never shows Drew's $1,400 budget, his over/under line, or his flex/mustHaves on Chris's screens. No organizer view, payment grid, export, or network response for Chris contains another member's budget. The Cabo option shows "Fits most" and "based on 6 budgets" only — never "Drew is over" or "1 person is over."  
- [ ] Group badges on the seed destination poll are reproducible: Scottsdale (and Nashville, Austin) = Fits everyone; Cabo = Fits most; each "based on 6 budgets."  
- [ ] As Drew, Cabo shows "You're $81 over" and the suggestion that a couch gets him under by $164 and a shared queen by $62. As Chris, the same option does not reveal that Drew is over.  
- [ ] The organizer can hide the Cabo option before voting opens; members then cannot vote for it; the organizer can unhide it. Budgets do not block voting or buy-in.  
- [ ] Chris's official N=5 Nashville all-in is displayed as $1,248–$1,308 (midpoint $1,278). The forecast slider shows a band at each N. Group feasibility uses each member's high fare.  
- [ ] Validation goal: The prototype exists to test whether friends will actually prepay a buy-in that stays refundable until the stay is booked. Payments remain stubbed. Success is a friend group completing the commit-and-spot-pick flow (even with fake payments) and the organizer seeing auto-drop, re-price, and the booking_ready → booked handoff; it is not processing real money or taking the lodging card off the organizer.

---

## 11\. Validation metrics

The prototype stays payment-stubbed. These metrics are how we tell whether the product is actually changing organizer pain, and they should be logged (even as dummy events) so a later real-money test can reuse them.

- **Commitment rate:** percent of trips that reach full commitment — `|P| >= minHeadcount` and the trip enters `booking_ready` (and, separately, the percent that then reach `booked`).  
- **Time to commit:** days from first invite sent (or first member joined, if invite send is stubbed) to the moment `|P|` first reaches minHeadcount, and to each individual member's buy-in.  
- **Organizer out-of-pocket vs. last trip:** a short after-trip prompt to the organizer (stub): what they fronted on the previous comparable trip vs. what they fronted here. The prototype cannot pay the Airbnb, so this is a self-reported comparison, but it is the metric that matters to Jeremy.  
- **Looping organizers:** invitees (members on a trip they did not create) who later start their own trip in the product.

**Caveat:** tests inside Jeremy's own network will overstate commitment. Friends who will do him a favor, or who already intended to go, are not a random bachelor-party crew. Treat early rates as a ceiling, not a forecast, and say so on any results readout.

---

*End of MVP Spec v1.3. Section 2 is based on the November 24, 2026 competitive scan. Headline differentiators are private budgets and room-tiered lodging. Payments stay stubbed; the validation goal is whether friends will actually prepay, and whether private budgets change how the group picks a destination.*