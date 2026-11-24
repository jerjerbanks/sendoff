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
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-accent/40 bg-[#1b1611]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Demo{step ? ` · Step ${step.n} of ${total}` : ""}
        </p>
        <Link href="/" className="text-xs font-semibold text-muted">
          Exit demo
        </Link>
      </div>
      {step ? (
        <>
          <p className="mt-1 font-serif text-xl leading-tight">
            You&apos;re {who}. <span className="text-ink/90">{step.goal}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{step.why}</p>
          <div className="mt-3 flex items-center gap-2">
            {step.n > 1 ? (
              <a href={`/demo/${step.n - 1}`} className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold">
                Back
              </a>
            ) : null}
            {step.n === 5 && deadlinePending ? (
              <form action={simulateDeadlineAction}>
                <input type="hidden" name="tripId" value={tripId} />
                <button type="submit" className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
                  Run the deadline
                </button>
              </form>
            ) : null}
            {step.n < total ? (
              <a
                href={`/demo/${step.n + 1}`}
                className={`ml-auto inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${step.n === 5 && deadlinePending ? "border border-line" : "bg-accent text-accent-ink"}`}
              >
                Next step →
              </a>
            ) : (
              <Link href="/#start" className="ml-auto inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
                Start your own trip →
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">This is a sample trip. The tour walks you through it in 7 steps.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
          <a href="/demo/1" className="inline-flex h-10 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
            Start the tour
          </a>
        </div>
      )}
      {view ? <DemoControls view={view} /> : null}
    </div>
  );
}

/** Off-script tools for poking around: anyone on the trip, the clock, a reset. Demo trips only. */
function DemoControls({ view }: { view: TripView }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-muted">Demo controls · viewing as {view.viewer?.name.split(" ")[0] ?? "nobody"}</summary>
      <div className="mt-2 grid gap-3 rounded-2xl border border-line bg-card p-3">
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
                    {member.userId === view.viewer?.userId ? <span className="text-xs text-accent">You</span> : null}
                  </button>
                </form>
              )),
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Clock · {view.simulated ? formatWhen(view.now) : "real time"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={simulateDeadlineAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-full bg-ink px-3 text-xs font-semibold text-card" type="submit">
                Run the deadline
              </button>
            </form>
            <form action={jumpSecondAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold" type="submit">
                Skip past a payment
              </button>
            </form>
            <form action={resetClockAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold" type="submit">
                Real time
              </button>
            </form>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
            <a href="/demo/1" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-xs font-semibold">
              Restart the tour
            </a>
          </div>
        </div>
      </div>
    </details>
  );
}
