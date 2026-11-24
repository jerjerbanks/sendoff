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

  return (
    <div className="grid gap-4">
      <div>
        {welcome ? <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 1 of 2 · Who&apos;s coming</p> : null}
        <h2 className="font-serif text-3xl">{editingOther ? party.name : "Your party"}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          A party is the household, couple, or single person who commits and pays as one. Add everyone you&apos;re bringing, including kids
          and anyone who won&apos;t use the app. {party.travelers.length > 1 || !editingOther ? "The payer acts for them." : ""}
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
        <p className="rounded-2xl bg-chip px-3 py-3 text-sm">
          {party.payerName.split(" ")[0]} pays for this party and manages who&apos;s on it. You can vote and see the plan.
        </p>
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-2xl">{party.travelers.length} {party.travelers.length === 1 ? "person" : "people"}</h3>
          <p className="text-sm text-muted">
            {party.bedsNeeded} need a bed · per-head weight {party.ageWeight}
          </p>
        </div>
        <ul className="mt-3 grid gap-3">
          {party.travelers.map((traveler) => (
            <li key={traveler.id} className="rounded-2xl border border-line p-3">
              {canEdit && !closed && !traveler.isHonoree ? (
                <form action={updateTravelerAction} className="grid gap-2">
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={viewer.userId} />
                  <input type="hidden" name="travelerId" value={traveler.id} />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input name="name" defaultValue={traveler.name} aria-label="Name" />
                    <select className={`${fieldClass} w-36`} name="ageBand" defaultValue={traveler.ageBand} aria-label="Age band">
                      {bands.map((band) => (
                        <option key={band} value={band}>
                          {ageBandLabel(band)} ({ageBandHint(band)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    name="needsNotes"
                    defaultValue={traveler.needsNotes ?? ""}
                    placeholder="Needs: mobility, crib, medical… (only the organizer sees this)"
                    aria-label="Needs, only the organizer sees this"
                  />
                  <p className="text-xs text-muted">
                    {traveler.isPayer ? "Payer · " : ""}
                    {traveler.hasAccount ? "Has the app" : "No app — you act for them"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton variant="secondary">Save</SubmitButton>
                    {!traveler.hasAccount ? (
                      <button
                        formAction={removeTravelerAction}
                        className="inline-flex h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold"
                        type="submit"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : (
                <div>
                  <p className="font-semibold">{traveler.name}</p>
                  <p className="text-sm text-muted">
                    {traveler.isHonoree ? honoreeRoleLabel(traveler.honoreeRole) : `${ageBandLabel(traveler.ageBand)} (${ageBandHint(traveler.ageBand)})`}
                    {traveler.isPayer ? " · payer" : ""}
                    {!traveler.hasAccount ? " · no app" : ""}
                  </p>
                  {traveler.needsNotes ? <p className="mt-1 text-sm text-warn">Needs: {traveler.needsNotes}</p> : null}
                </div>
              )}
            </li>
          ))}
        </ul>
        {canEdit && !closed ? (
          <form action={addTravelerAction} className="mt-4 grid gap-2 rounded-2xl bg-chip/60 p-3">
            <p className="text-sm font-semibold">Add someone</p>
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer.userId} />
            <input type="hidden" name="partyUserId" value={party.payerUserId} />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input name="name" placeholder="Name" required aria-label="Name" />
              <select className={`${fieldClass} w-36`} name="ageBand" defaultValue="adult" aria-label="Age band">
                {bands.map((band) => (
                  <option key={band} value={band}>
                    {ageBandLabel(band)} ({ageBandHint(band)})
                  </option>
                ))}
              </select>
            </div>
            <Input name="needsNotes" placeholder="Needs (optional, only the organizer sees this)" aria-label="Needs" />
            <SubmitButton variant="secondary">Add to the party</SubmitButton>
          </form>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Per-head costs (food, groceries, activities) weigh adults and teens {w.adult === w.teen ? w.adult : `${w.adult} and ${w.teen}`}, children{" "}
          {w.child}, infants {w.infant}. Lodging is priced by the beds your party claims, never by age. An infant in a crib takes no bed.
        </p>
        {party.bill?.payer ? <p className="mt-2 text-sm font-semibold">Party all-in right now: {money(party.bill.totalCents)}</p> : null}
      </section>

      {canEdit && !closed ? (
        <form action={savePartyAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={viewer.userId} />
          <input type="hidden" name="partyUserId" value={party.payerUserId} />
          {welcome && !editingOther && viewer.isPayer && viewer.role !== "honoree" ? <input type="hidden" name="next" value="budget" /> : null}
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
          <SubmitButton>{welcome && !editingOther && viewer.isPayer && viewer.role !== "honoree" ? "Save and set a private budget" : "Save party"}</SubmitButton>
        </form>
      ) : null}

      <Link href={`/trip/${view.id}`} className="text-sm font-semibold text-accent">
        {welcome ? "Skip to the trip" : "Back to the trip"}
      </Link>
    </div>
  );
}
