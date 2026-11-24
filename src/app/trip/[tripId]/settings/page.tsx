import {
  ackSplitModeAction,
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
  const view = await loadTripView(tripId, await getViewerId(), true);
  if (!view) return null;
  const me = view.viewer?.userId ?? "";
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
        {view.splitPreview[0] ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[16rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-1 pr-2 font-semibold">Your party</th>
                  <th className="py-1 pr-2 font-semibold">Now ({splitModeLabel(view.splitMode)})</th>
                  {view.pendingSplitMode && view.pendingSplitMode !== view.splitMode ? (
                    <th className="py-1 pr-2 font-semibold text-accent">If {splitModeLabel(view.pendingSplitMode)}</th>
                  ) : (
                    modes
                      .filter((mode) => mode !== view.splitMode)
                      .map((mode) => (
                        <th key={mode} className="py-1 pr-2 font-semibold">
                          {splitModeLabel(mode)}
                        </th>
                      ))
                  )}
                </tr>
              </thead>
              <tbody>
                {view.splitPreview.map((row) => (
                  <tr key={row.payerUserId} className="border-t border-line">
                    <td className="py-1.5 pr-2 font-medium">{row.name}</td>
                    <td className="py-1.5 pr-2 font-semibold">{money(row.byMode[view.splitMode])}</td>
                    {view.pendingSplitMode && view.pendingSplitMode !== view.splitMode ? (
                      <td className="py-1.5 pr-2 text-accent">{money(row.byMode[view.pendingSplitMode])}</td>
                    ) : (
                      modes
                        .filter((mode) => mode !== view.splitMode)
                        .map((mode) => (
                          <td key={mode} className="py-1.5 pr-2 text-muted">
                            {money(row.byMode[mode])}
                          </td>
                        ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Your before/after fills in once your party can see a share.</p>
        )}
        {view.isOrganizer && view.termsLocked ? (
          <div className="rounded-xl bg-warn-soft px-3 py-2 text-sm">
            <p className="font-medium text-warn">A change applies only after every committed party agrees.</p>
            {view.pendingSplitMode ? (
              <ul className="mt-2 grid gap-1">
                {view.splitAcks.map((row) => (
                  <li key={row.payerUserId} className="flex items-center justify-between gap-2">
                    <span>{row.name}</span>
                    <span className={row.acknowledged ? "text-good" : "text-muted"}>
                      {row.acknowledged ? "Agreed" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted">No change is waiting on agreement.</p>
            )}
          </div>
        ) : null}
        {view.pendingSplitMode && view.viewerParty && view.splitAcks.some((row) => row.payerUserId === me) ? (
          view.splitAcks.find((row) => row.payerUserId === me)?.acknowledged ? (
            <p className="text-sm text-good">You agreed to switch to {splitModeLabel(view.pendingSplitMode)}.</p>
          ) : (
            <form action={ackSplitModeAction} className="grid gap-2 rounded-xl border border-line p-3">
              {hidden}
              <p className="text-sm">
                Your share today is {money(view.splitPreview[0]?.byMode[view.splitMode] ?? view.viewerParty.bill?.totalCents ?? 0)}.
                If the group switches to {splitModeLabel(view.pendingSplitMode)}, yours becomes{" "}
                {money(view.splitPreview[0]?.byMode[view.pendingSplitMode] ?? 0)}.
              </p>
              <SubmitButton>I agree</SubmitButton>
            </form>
          )
        ) : null}
        {view.isOrganizer ? (
          <form action={splitModeAction} className="grid gap-2">
            {hidden}
            {modes.map((mode) => (
              <label key={mode} className="flex items-start gap-2 text-sm">
                <input
                  className="mt-1"
                  type="radio"
                  name="splitMode"
                  value={mode}
                  defaultChecked={(view.pendingSplitMode ?? view.splitMode) === mode}
                />
                <span>
                  <span className="font-semibold">{splitModeLabel(mode)}</span>
                  <span className="block text-muted">{splitModeHint(mode)}</span>
                </span>
              </label>
            ))}
            <SubmitButton>{view.termsLocked ? (view.pendingSplitMode ? "Update proposed split" : "Propose this split") : "Save lodging split"}</SubmitButton>
          </form>
        ) : !view.isOrganizer ? (
          <p className="text-sm text-muted">Only the organizer can propose a change. You&apos;ll be asked to agree if one is pending.</p>
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
