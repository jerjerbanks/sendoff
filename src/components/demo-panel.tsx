import Link from "next/link";
import {
  jumpSecondAction,
  resetClockAction,
  resetDemoAction,
  simulateDeadlineAction,
  switchUserAction,
} from "@/app/actions";
import { DEMO_TRIP_ID, LAKE_TRIP_ID } from "@/lib/constants";
import { formatWhen } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import type { TripView } from "@/lib/view";

/** Guided entry points into each demo, told from one person's side. */
const stories: Record<string, { userId: string; next: string; title: string; line: string }[]> = {
  [DEMO_TRIP_ID]: [
    { userId: "user_taylor", next: "", title: "Taylor", line: "Undecided. Can you afford Nashville?" },
    { userId: "user_drew", next: "/vote", title: "Drew", line: "Cabo is over your private budget." },
    { userId: "user_chris", next: "", title: "Chris", line: "The organizer, usually stuck with the bill." },
    { userId: "user_alex", next: "", title: "Alex", line: "Guest of honor. The group covers you." },
  ],
  [LAKE_TRIP_ID]: [
    { userId: "user_maya", next: "", title: "Maya", line: "Organizes for four households." },
    { userId: "user_helen", next: "/spots", title: "Helen", line: "Grandparents with a ground-floor hold." },
    { userId: "user_priya", next: "/costs", title: "Priya", line: "Brings a baby; kids pay less of the food." },
    { userId: "user_noah", next: "", title: "Noah", line: "Solo on a family trip." },
  ],
};

/** All demo and prototype controls, folded into one chip so the trip comes first. */
export function DemoPanel({ view }: { view: TripView }) {
  const list = stories[view.id] ?? [];
  const who = view.viewer ? view.viewer.name.split(" ")[0] : "nobody";
  return (
    <details className="group mt-3">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-dashed border-line px-3 text-xs font-semibold text-muted">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden />
        {view.isDemo ? "Demo" : "Prototype"} · viewing as {who}
        <span className="transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-2 grid gap-4 rounded-3xl border border-line bg-card p-3">
        {list.length > 0 ? (
          <section>
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Try it as</p>
            <div className="mt-2 grid gap-2">
              {list.map((story) => (
                <form key={story.userId} action={switchUserAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={story.userId} />
                  <input type="hidden" name="next" value={story.next} />
                  <button
                    type="submit"
                    className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${story.userId === view.viewer?.userId ? "bg-accent text-accent-ink" : "bg-chip"}`}
                  >
                    <span className="font-serif text-lg">{story.title}</span>
                    <span className={`text-sm ${story.userId === view.viewer?.userId ? "" : "text-muted"}`}>{story.line}</span>
                  </button>
                </form>
              ))}
            </div>
          </section>
        ) : null}

        <details>
          <summary className="cursor-pointer px-1 text-xs font-semibold uppercase tracking-wide text-muted">Everyone on the trip</summary>
          <div className="mt-2 grid gap-1">
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
        </details>

        <section>
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Clock · {view.simulated ? formatWhen(view.now) : "real time"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={simulateDeadlineAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-full bg-ink px-3 text-xs font-semibold text-card" type="submit">Run the deadline</button>
            </form>
            <form action={jumpSecondAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold" type="submit">Skip past a payment</button>
            </form>
            <form action={resetClockAction}>
              <input type="hidden" name="tripId" value={view.id} />
              <button className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold" type="submit">Real time</button>
            </form>
            {view.isDemo ? (
              <form action={resetDemoAction}>
                <input type="hidden" name="tripId" value={view.id} />
                <button className="min-h-9 rounded-full border border-line px-3 text-xs font-semibold" type="submit">Reset demo</button>
              </form>
            ) : null}
          </div>
        </section>

        {view.isDemo ? (
          <Link className="px-1 text-sm font-semibold text-accent" href={`/demo?trip=${view.id === LAKE_TRIP_ID ? DEMO_TRIP_ID : LAKE_TRIP_ID}`}>
            Switch to the {view.id === LAKE_TRIP_ID ? "pre-wedding" : "family"} demo →
          </Link>
        ) : null}
      </div>
    </details>
  );
}
