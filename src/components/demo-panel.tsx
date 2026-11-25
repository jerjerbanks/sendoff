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
  return (
    <>
      <PhoneDemoBar view={view} step={step} total={total} who={who} runDeadline={runDeadline} tripId={tripId} />
      <div className="sticky top-0 z-30 hidden border-b border-line-strong bg-chip px-5 py-3 md:block">
        <div className="flex items-center justify-between gap-3">
          <p className="ft-lbl clay">
            Demo{step ? ` · Step ${step.n} of ${total}` : ""}
          </p>
          <Link href="/" className="text-xs font-semibold text-muted">
            Exit demo
          </Link>
        </div>
        {step ? (
          <>
            <p className="ft-h2 mt-1 leading-tight">
              You&apos;re {who}. <span className="text-ink/90">{step.goal}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{step.why}</p>
            <div className="mt-3 flex items-center gap-2">
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
                <Link href="/new" className="ml-auto inline-flex h-10 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink">
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
          <details className="mt-2">
            <summary className="ft-summary text-[15px] font-medium text-ink-2">Demo controls · viewing as {view.viewer?.name.split(" ")[0] ?? "nobody"}</summary>
            <div className="mt-2 rounded-md border border-line bg-card p-3">
              <DemoControls view={view} />
            </div>
          </details>
        ) : null}
      </div>
    </>
  );
}

/**
 * Phones (up to 767px): one 40px row. The step label, Back / Next (or the tour's
 * deadline action), and a disclosure that drops down over the page with the step's
 * goal and why, the persona switcher, the clock and Exit. It scrolls with the page.
 */
function PhoneDemoBar({
  view,
  step,
  total,
  who,
  runDeadline,
  tripId,
}: {
  view: TripView | null;
  step: ReturnType<typeof tourStep> | null;
  total: number;
  who: string;
  runDeadline: boolean;
  tripId: string;
}) {
  const cell = "inline-flex h-full min-w-11 items-center justify-center border-l border-line-strong px-3 text-sm font-semibold";
  return (
    <div className="relative z-30 md:hidden">
      <div className="flex h-10 items-stretch border-b border-line-strong bg-chip pl-5">
        <p className="ft-lbl clay flex min-w-0 flex-1 items-center truncate">
          Demo · {step ? `${step.n}/${total} · ${who}` : "sample trip"}
        </p>
        {step && step.n > 1 ? (
          <a href={`/demo/${step.n - 1}`} className={cell} aria-label="Back a step">
            ←
          </a>
        ) : null}
        {runDeadline ? (
          <form action={simulateDeadlineAction} className="contents">
            <input type="hidden" name="tripId" value={tripId} />
            <button type="submit" className={`${cell} bg-accent text-accent-ink`}>
              Run deadline
            </button>
          </form>
        ) : null}
        {step ? (
          step.n < total ? (
            <a href={`/demo/${step.n + 1}`} className={`${cell} ${runDeadline ? "" : "bg-accent text-accent-ink"}`}>
              Next →
            </a>
          ) : (
            <Link href="/new" className={`${cell} bg-accent text-accent-ink`}>
              Start yours →
            </Link>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation
          <a href="/demo/1" className={`${cell} bg-accent text-accent-ink`}>
            Start the tour
          </a>
        )}
        <details className="group flex">
          <summary
            className={`${cell} h-full cursor-pointer list-none text-ink-2 group-open:bg-card [&::-webkit-details-marker]:hidden`}
            aria-label={`What to do, and who you're viewing as (${who})`}
          >
            <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden className="transition-transform group-open:rotate-180">
              <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </summary>
          <div className="absolute inset-x-0 top-full grid max-h-[70dvh] gap-3 overflow-y-auto border-b border-line-strong bg-chip px-5 pb-4 pt-3 shadow-[var(--shadow-2)]">
            {step ? (
              <div>
                <p className="text-[16px] font-semibold leading-snug">
                  You&apos;re {who}. <span className="text-ink/90">{step.goal}</span>
                </p>
                <p className="mt-1 text-sm text-muted">{step.why}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">This is a sample trip. The tour walks you through it in 7 steps.</p>
            )}
            {view ? <DemoControls view={view} /> : null}
            <Link href="/" className="ft-link justify-self-start text-sm">
              Exit demo
            </Link>
          </div>
        </details>
      </div>
    </div>
  );
}

function DeadlineButton({ tripId }: { tripId: string }) {
  return (
    <form action={simulateDeadlineAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-ink"
      >
        Run the deadline
      </button>
    </form>
  );
}

/** Off-script tools for poking around: anyone on the trip, the clock, a reset. Demo trips only. */
function DemoControls({ view }: { view: TripView }) {
  return (
    <div className="grid gap-3">
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
        </div>
      </div>
    </div>
  );
}
