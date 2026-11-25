import Link from "next/link";
import { cookies } from "next/headers";
import { jumpSecondAction, resetClockAction, simulateDeadlineAction, switchUserAction } from "@/app/actions";
import { DEMO_STEP_COOKIE, TOUR, tourStep } from "@/lib/demo-tour";
import { formatWhen } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import type { TripView } from "@/lib/view";

/** Which tour step this browser is on, if any. */
export async function currentTourStep(): Promise<number | null> {
  const value = (await cookies()).get(DEMO_STEP_COOKIE)?.value;
  const n = Number(value);
  return tourStep(n) ? n : null;
}

/**
 * The guided demo's banner. Only ever rendered on the seeded demo trips: it says
 * who you are and what to tap, with Back/Next. Demo-only controls fold inside.
 */
export async function DemoBanner({ view, tripId, viewerName }: { view: TripView | null; tripId: string; viewerName: string | null }) {
  const n = await currentTourStep();
  const step = n ? tourStep(n) : null;
  const total = TOUR.length;
  const who = viewerName ?? step?.name ?? "nobody";
  // Before booking, the deadline still has work to do while anyone hasn't paid.
  const deadlinePending =
    !!view &&
    (view.status === "buy_in_open" || view.status === "booking_ready") &&
    view.parties.some((party) => party.status === "joined" || party.status === "invited");
  const runDeadline = step?.n === 5 && deadlinePending;
  // Below md the banner is two lines plus a fold: the step, Back/Next in the label
  // row, and the goal; the why, Exit and controls fold away. At md and up it is the
  // full banner. Either way it scrolls with the page on phones so it never covers content.
  return (
    <div className="relative z-30 border-b border-line-strong bg-chip px-5 py-2.5 md:sticky md:top-0 md:py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="ft-lbl clay">
          Demo
          {step ? (
            <>
              <span className="md:hidden"> · {step.n}/{total}</span>
              <span className="hidden md:inline"> · Step {step.n} of {total}</span>
            </>
          ) : null}
        </p>
        {step ? (
          <div className="flex items-center gap-1.5 md:hidden">
            {step.n > 1 ? (
              <a href={`/demo/${step.n - 1}`} className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-line" aria-label="Back a step">
                ←
              </a>
            ) : null}
            {runDeadline ? <DeadlineButton tripId={tripId} compact /> : null}
            {step.n < total ? (
              <a
                href={`/demo/${step.n + 1}`}
                className={`inline-flex h-9 items-center rounded-sm px-3 text-sm font-semibold ${runDeadline ? "border border-line" : "bg-accent text-accent-ink"}`}
              >
                Next →
              </a>
            ) : (
              <Link href="/#start" className="inline-flex h-9 items-center rounded-sm bg-accent px-3 text-sm font-semibold text-accent-ink">
                Start yours →
              </Link>
            )}
            {view ? <DemoControls view={view} why={step.why} compact /> : null}
          </div>
        ) : null}
        <Link href="/" className={`text-xs font-semibold text-muted ${step ? "hidden md:inline" : ""}`}>
          Exit demo
        </Link>
      </div>
      {step ? (
        <>
          <p className="ft-demo-goal mt-1">
            You&apos;re {who}. <span className="text-ink/90">{step.goal}</span>
          </p>
          <p className="mt-1 hidden text-sm text-muted md:block">{step.why}</p>
          <div className="mt-3 hidden items-center gap-2 md:flex">
            {step.n > 1 ? (
              <a href={`/demo/${step.n - 1}`} className="inline-flex h-10 items-center rounded-sm border border-line px-4 text-sm font-semibold">
                Back
              </a>
            ) : null}
            {runDeadline ? <DeadlineButton tripId={tripId} /> : null}
            {step.n < total ? (
              <a
                href={`/demo/${step.n + 1}`}
                className={`ml-auto inline-flex h-10 items-center rounded-sm px-4 text-sm font-semibold ${runDeadline ? "border border-line" : "bg-accent text-accent-ink"}`}
              >
                Next step →
              </a>
            ) : (
              <Link href="/#start" className="ml-auto inline-flex h-10 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink">
                Start your own trip →
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">This is a sample trip. The tour walks you through it in 7 steps.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
          <a href="/demo/1" className="inline-flex h-10 shrink-0 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink">
            Start the tour
          </a>
        </div>
      )}
      {view ? (
        <div className={step ? "hidden md:block" : ""}>
          <DemoControls view={view} why={null} />
        </div>
      ) : null}
    </div>
  );
}

function DeadlineButton({ tripId, compact = false }: { tripId: string; compact?: boolean }) {
  return (
    <form action={simulateDeadlineAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <button
        type="submit"
        className={`inline-flex items-center rounded-sm bg-accent text-sm font-semibold text-accent-ink ${compact ? "h-9 px-3" : "h-10 px-4"}`}
      >
        {compact ? "Run deadline" : "Run the deadline"}
      </button>
    </form>
  );
}

/** Off-script tools for poking around: anyone on the trip, the clock, a reset. Demo trips only. */
function DemoControls({ view, why, compact = false }: { view: TripView; why: string | null; compact?: boolean }) {
  const as = view.viewer?.name.split(" ")[0] ?? "nobody";
  // Compact (phones, on a tour step): a 36px "More" button in the banner's top row
  // that drops the why, the controls and Exit over the page below the banner.
  return (
    <details className={compact ? "group" : "mt-2"}>
      <summary
        className={
          compact
            ? "inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-sm border border-line text-ink-2 group-open:bg-card [&::-webkit-details-marker]:hidden"
            : "ft-summary text-[15px] font-medium text-ink-2"
        }
        aria-label={compact ? `Why this step, and demo controls (viewing as ${as})` : undefined}
      >
        {compact ? (
          <svg width="16" height="4" viewBox="0 0 16 4" aria-hidden>
            <circle cx="2" cy="2" r="1.6" fill="currentColor" />
            <circle cx="8" cy="2" r="1.6" fill="currentColor" />
            <circle cx="14" cy="2" r="1.6" fill="currentColor" />
          </svg>
        ) : (
          `Demo controls · viewing as ${as}`
        )}
      </summary>
      <div
        className={
          compact
            ? "absolute inset-x-0 top-full z-40 grid gap-3 border-b border-line-strong bg-chip px-5 pb-4 pt-3 shadow-[var(--shadow-2)]"
            : "mt-2 grid gap-3 rounded-md border border-line bg-card p-3"
        }
      >
        {why ? <p className="text-sm text-muted">{why}</p> : null}
        {compact ? <p className="ft-lbl">Viewing as {as}</p> : null}
        <div className="grid gap-1">
          {view.parties.map((party) =>
            view.members
              .filter((member) => member.partyUserId === party.payerUserId)
              .map((member) => (
                <form key={member.userId} action={switchUserAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <button type="submit" className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm hover:bg-chip">
                    <span>
                      {member.name}
                      <span className="text-muted"> · {member.isPayer ? roleLabel(member.role) : `on ${party.name}`}</span>
                    </span>
                    {member.userId === view.viewer?.userId ? <span className="text-xs text-clay-ink">You</span> : null}
                  </button>
                </form>
              )),
          )}
        </div>
        <div>
          <p className="ft-lbl">Clock · {view.simulated ? formatWhen(view.now) : "real time"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={simulateDeadlineAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-sm bg-ink px-3 text-xs font-semibold text-card" type="submit">
                Run the deadline
              </button>
            </form>
            <form action={jumpSecondAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-sm border border-line px-3 text-xs font-semibold" type="submit">
                Skip past a payment
              </button>
            </form>
            <form action={resetClockAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-sm border border-line px-3 text-xs font-semibold" type="submit">
                Real time
              </button>
            </form>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
            <a href="/demo/1" className="inline-flex min-h-9 items-center rounded-sm border border-line px-3 text-xs font-semibold">
              Restart the tour
            </a>
            {compact ? (
              <Link href="/" className="inline-flex min-h-9 items-center rounded-sm border border-line px-3 text-xs font-semibold">
                Exit demo
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </details>
  );
}
