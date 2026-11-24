import Link from "next/link";
import { addTravelerAction, removeTravelerAction, savePartyAction, updateTravelerAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { ageBandHint, ageBandLabel, honoreeRoleLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

const bands = ["adult", "teen", "child", "infant"] as const;

/** S18. The payer manages the party and the people on it, including anyone without the app. */
export default async function PartyPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; welcome?: string; party?: string }>;
}) {
  const { tripId } = await params;
  const { error, welcome, party: partyParam } = await searchParams;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view || !view.viewer) return null;
  const viewer = view.viewer;
  const party =
    (view.isOrganizer && partyParam ? view.parties.find((item) => item.payerUserId === partyParam) : null) ?? view.viewerParty;
  if (!party) return null;
  const canEdit = view.isOrganizer || viewer.userId === party.payerUserId;
  const editingOther = party.payerUserId !== viewer.partyUserId;
  const closed = party.status === "off_trip" || party.status === "declined" || view.cancelled;
  const w = view.ageWeights;

  const hidden = (
    <>
      <input type="hidden" name="tripId" value={view.id} />
      <input type="hidden" name="userId" value={viewer.userId} />
    </>
  );
  const solo = party.travelers.length === 1;
  const nextHref = viewer.isPayer && viewer.role !== "honoree" && !view.viewerHasBudget ? `/trip/${view.id}/budget?welcome=1` : `/trip/${view.id}`;

  return (
    <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
      <div>
        {welcome ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Step 1 of 2</p> : null}
        <h2 className="font-serif text-4xl leading-none">{editingOther ? party.name : welcome ? "Who's coming with you?" : "Your party"}</h2>
        <p className="mt-2 text-sm text-muted">
          {editingOther
            ? `Paid by ${party.payerName.split(" ")[0]}.`
            : "Add a partner, kids, or anyone you're bringing — even people without the app. One buy-in covers everyone here."}
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {view.isOrganizer && view.parties.length > 1 ? (
        <nav className="flex flex-wrap gap-2" aria-label="Parties">
          {view.parties.map((item) => (
            <Link
              key={item.payerUserId}
              href={`/trip/${view.id}/party?party=${item.payerUserId}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.payerUserId === party.payerUserId ? "bg-accent text-accent-ink" : "border border-line bg-card"}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {!canEdit ? (
        <p className="rounded-2xl bg-chip px-4 py-3 text-sm">{party.payerName.split(" ")[0]} manages this party. You can vote and see the plan.</p>
      ) : null}

      <ul className="grid gap-2">
        {party.travelers.map((traveler) => {
          const meta = `${traveler.isHonoree ? honoreeRoleLabel(traveler.honoreeRole) : `${ageBandLabel(traveler.ageBand)} (${ageBandHint(traveler.ageBand)})`}${traveler.isPayer ? " · pays" : ""}${!traveler.hasAccount ? " · no app" : ""}`;
          const editable = canEdit && !closed && !traveler.isHonoree;
          return (
            <li key={traveler.id} className="rounded-2xl border border-line bg-card">
              {editable ? (
                <details>
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip font-serif">{traveler.name.charAt(0)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{traveler.name}</span>
                      <span className="block text-xs text-muted">{meta}</span>
                    </span>
                    <span className="text-xs font-semibold text-accent">Edit</span>
                  </summary>
                  <form action={updateTravelerAction} className="grid gap-2 px-4 pb-4">
                    {hidden}
                    <input type="hidden" name="travelerId" value={traveler.id} />
                    <div className="grid grid-cols-[1fr_auto] gap-2 [&>*]:min-w-0">
                      <Input name="name" defaultValue={traveler.name} aria-label="Name" />
                      <select className={`${fieldClass} w-36`} name="ageBand" defaultValue={traveler.ageBand} aria-label="Age">
                        {bands.map((band) => (
                          <option key={band} value={band}>
                            {ageBandLabel(band)} ({ageBandHint(band)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input name="needsNotes" defaultValue={traveler.needsNotes ?? ""} placeholder="Needs (only the organizer sees this)" aria-label="Needs, only the organizer sees this" />
                    <div className="flex flex-wrap gap-2">
                      <SubmitButton variant="secondary">Save</SubmitButton>
                      {!traveler.hasAccount ? (
                        <button formAction={removeTravelerAction} className="inline-flex h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold" type="submit">
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </form>
                </details>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip font-serif">{traveler.name.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{traveler.name}</span>
                    <span className="block text-xs text-muted">{meta}</span>
                    {traveler.needsNotes ? <span className="block text-xs text-warn">Needs: {traveler.needsNotes}</span> : null}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && !closed ? (
        <form action={addTravelerAction} className="grid gap-2 rounded-2xl border border-dashed border-line p-4">
          {hidden}
          <input type="hidden" name="partyUserId" value={party.payerUserId} />
          <p className="text-sm font-semibold">Add someone</p>
          <div className="grid grid-cols-[1fr_auto] gap-2 [&>*]:min-w-0">
            <Input name="name" placeholder="Name" required aria-label="Name" />
            <select className={`${fieldClass} w-36`} name="ageBand" defaultValue="adult" aria-label="Age">
              {bands.map((band) => (
                <option key={band} value={band}>
                  {ageBandLabel(band)} ({ageBandHint(band)})
                </option>
              ))}
            </select>
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-muted">Any needs? (mobility, crib… only the organizer sees this)</summary>
            <Input className="mt-2" name="needsNotes" placeholder="e.g. needs a ground-floor room" aria-label="Needs" />
          </details>
          <SubmitButton variant="outline">Add to the party</SubmitButton>
        </form>
      ) : null}

      {party.bill?.payer ? (
        <p className="text-sm text-muted">
          {solo ? "Your" : "Party"} all-in right now: <span className="font-semibold text-ink">{money(party.bill.totalCents)}</span>. Kids pay less of the
          food and activities (children count as {w.child}, infants {w.infant}); lodging depends on the beds you claim.
        </p>
      ) : null}

      {canEdit && !closed ? (
        <details className="rounded-2xl border border-line bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">Party name and rooming preference (optional)</summary>
          <form action={savePartyAction} className="grid gap-3 px-4 pb-4">
            {hidden}
            <input type="hidden" name="partyUserId" value={party.payerUserId} />
            <label className="text-sm font-medium">
              Party name
              <Input className="mt-1.5" name="name" defaultValue={party.name} required />
            </label>
            <fieldset className="grid gap-2 text-sm">
              <legend className="font-medium">Sharing a room with another party</legend>
              <p className="text-xs text-muted">Only the organizer sees this. Sendoff never assigns roommates, and never by gender.</p>
              {[
                ["any", "Open to it if we both say yes"],
                ["no_share", "We'd rather not"],
                ["note_only", "It depends (add a note)"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input type="radio" name="shareComfort" value={value} defaultChecked={(party.shareComfort ?? "any") === value} />
                  {label}
                </label>
              ))}
              <Input name="shareComfortNote" defaultValue={party.shareComfortNote ?? ""} placeholder="Private note to the organizer" aria-label="Private note" />
            </fieldset>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </form>
        </details>
      ) : null}

      {!editingOther ? (
        <Link href={nextHref} className="flex h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-ink">
          {welcome ? (solo ? "Just me — continue" : "Continue") : "Done"}
        </Link>
      ) : null}
    </div>
  );
}
