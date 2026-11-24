import {
  ageWeightsAction,
  bedPolicyAction,
  headcountsAction,
  honoreeExclusionAction,
  simulateDeadlineAction,
  splitModeAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { ageBandHint, ageBandLabel, splitModeHint, splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

const modes = ["weighted_by_spot", "even_per_traveler", "even_per_party"] as const;

/** S12. Organizer controls. */
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tripId } = await params;
  const { error } = await searchParams;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) return null;
  const me = view.viewer?.userId ?? "";
  const anyPaid = view.members.some((member) => member.paidCents > 0);
  const hidden = (
    <>
      <input type="hidden" name="tripId" value={view.id} />
      <input type="hidden" name="userId" value={me} />
    </>
  );
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          {view.subtitle}. Invite code {view.inviteToken}. Payments are simulated; no real money moves.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {!view.isOrganizer ? <p className="text-sm">Only the organizer changes these.</p> : null}

      <section className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <h3 className="font-serif text-2xl">How lodging splits</h3>
        <p className="text-sm text-muted">Per-head costs follow age weights in every mode. This only changes the lodging bill.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-1 pr-2 font-semibold">Party</th>
                {modes.map((mode) => (
                  <th key={mode} className={`py-1 pr-2 font-semibold ${mode === view.splitMode ? "text-accent" : ""}`}>
                    {splitModeLabel(mode)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.splitPreview.map((row) => (
                <tr key={row.payerUserId} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-medium">{row.name}</td>
                  {modes.map((mode) => (
                    <td key={mode} className={`py-1.5 pr-2 ${mode === view.splitMode ? "font-semibold" : "text-muted"}`}>
                      {money(row.byMode[mode])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {view.splitPreview.length === 0 ? <p className="text-sm text-muted">The before/after fills in once parties commit.</p> : null}
        {view.isOrganizer ? (
          <form action={splitModeAction} className="grid gap-2">
            {hidden}
            {modes.map((mode) => (
              <label key={mode} className="flex items-start gap-2 text-sm">
                <input className="mt-1" type="radio" name="splitMode" value={mode} defaultChecked={view.splitMode === mode} />
                <span>
                  <span className="font-semibold">{splitModeLabel(mode)}</span>
                  <span className="block text-muted">{splitModeHint(mode)}</span>
                </span>
              </label>
            ))}
            {anyPaid ? (
              <label className="flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
                <input className="mt-1" type="checkbox" name="acknowledged" value="yes" />
                Someone has bought in, so this is locked. Tick only after every committed party has seen its before/after above and agreed.
              </label>
            ) : null}
            <SubmitButton>Save lodging split</SubmitButton>
          </form>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <h3 className="font-serif text-2xl">Per-head weights</h3>
        <p className="text-sm text-muted">Food, groceries, activities, tickets. Never lodging. 1 is a full share.</p>
        <form action={ageWeightsAction} className="grid gap-3">
          {hidden}
          <div className="grid grid-cols-2 gap-2">
            {(["adult", "teen", "child", "infant"] as const).map((band) => (
              <label key={band} className="text-sm font-medium">
                {ageBandLabel(band)} <span className="font-normal text-muted">({ageBandHint(band)})</span>
                <Input className="mt-1" name={band} type="number" step="0.05" min={0} max={2} defaultValue={view.ageWeights[band]} disabled={!view.isOrganizer} />
              </label>
            ))}
          </div>
          {view.isOrganizer ? <SubmitButton variant="secondary">Save weights</SubmitButton> : null}
        </form>
      </section>

      <section className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <h3 className="font-serif text-2xl">Who has to commit</h3>
        <form action={headcountsAction} className="grid gap-3">
          {hidden}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">
              Paying parties to book
              <Input className="mt-1" name="minPayers" type="number" min={1} defaultValue={view.minPayerCount} disabled={!view.isOrganizer} />
            </label>
            <label className="text-sm font-medium">
              Most travelers
              <Input className="mt-1" name="maxTravelers" type="number" min={1} defaultValue={view.maxHeadcount} disabled={!view.isOrganizer} />
            </label>
          </div>
          <p className="text-xs text-muted">
            A family of four that buys in counts once toward booking and four times toward the traveler cap. Lowering the minimum when the trip is
            under it moves the trip to ready-to-book.
          </p>
          {view.isOrganizer ? <SubmitButton variant="secondary">Save</SubmitButton> : null}
        </form>
      </section>

      {view.honoreeNames.length > 0 ? (
        <section className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Guests of honor</h3>
          <p className="text-sm">{view.honoreeNames.join(" and ")}</p>
          <form action={honoreeExclusionAction} className="grid gap-2">
            {hidden}
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" name="excluded" value="yes" defaultChecked={view.honoreeExcluded} disabled={!view.isOrganizer || view.termsLocked} />
              The group covers their share (their room is gifted and they skip the buy-in).
            </label>
            {view.isOrganizer && !view.termsLocked ? <SubmitButton variant="secondary">Save</SubmitButton> : null}
            {view.termsLocked ? <p className="text-xs text-muted">Locked once someone has bought in.</p> : null}
          </form>
        </section>
      ) : null}

      <section className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <h3 className="font-serif text-2xl">Who can move beds</h3>
        {view.isOrganizer ? (
          <form action={bedPolicyAction} className="grid gap-3">
            {hidden}
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="policy" value="member_requests" defaultChecked={view.bedChangePolicy === "member_requests"} />
              <span>Parties can ask to share or switch. You approve. Sharing between parties also needs both parties&apos; yes.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="policy" value="locked" defaultChecked={view.bedChangePolicy === "locked"} />
              <span>Locked. Only you move people. Approved beds stay where they are.</span>
            </label>
            <SubmitButton variant="secondary">Save bed policy</SubmitButton>
          </form>
        ) : (
          <p className="text-sm">Bed changes are {view.bedChangePolicy === "locked" ? "locked to the organizer" : "requested, then approved"}.</p>
        )}
      </section>

      {view.isOrganizer ? (
        <form action={simulateDeadlineAction} className="rounded-3xl border border-line bg-card p-4">
          <input type="hidden" name="tripId" value={view.id} />
          <p className="mb-3 text-sm text-muted">Prototype only. Runs the commit deadline now and drops every party that has not bought in.</p>
          <SubmitButton variant="secondary">Simulate deadline now</SubmitButton>
        </form>
      ) : null}
      <a href={`/trip/${view.id}/approvals`} className="text-sm font-semibold text-accent">Open the approvals queue</a>
    </div>
  );
}
