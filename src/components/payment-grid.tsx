import { money } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/labels";
import type { MemberView, TripView } from "@/lib/view";

const tone: Record<string, string> = {
  paid: "pine",
  due: "",
  late: "warn",
  forfeited: "bad",
  refunded: "text-muted",
};

export function PaymentGrid({ view }: { view: TripView }) {
  if (view.milestones.length === 0) {
    return <p className="text-sm text-muted">Payments show up once the organizer opens buy-in.</p>;
  }
  const payers = view.members.filter((member) => member.isPayer);
  return (
    <>
      {/* Phones: one card per party with every payment stacked, so no column (Final included) is ever cut off. */}
      <ul className="grid gap-2 sm:hidden" aria-label="Who has paid">
        {payers.map((member) => {
          const party = view.parties.find((item) => item.payerUserId === member.userId);
          return (
            <li key={member.userId} className="rounded-2xl border border-line bg-card px-3 py-2">
              <p className="text-sm font-medium">
                {member.name}
                {party && party.travelers.length > 1 ? <span className="block text-xs font-normal text-muted">{party.name} · {party.travelers.length} people</span> : null}
              </p>
              <dl className="mt-1 grid gap-1">
                {view.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-muted">{milestone.name}</dt>
                    <dd>
                      <Cell member={member} milestoneId={milestone.id} honoree={member.role === "honoree"} />
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    <div className="hidden overflow-x-auto rounded-2xl border border-line sm:block">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead className="ft-lbl bg-chip">
          <tr>
            <th className="sticky left-0 bg-chip px-3 py-2 font-semibold">Party</th>
            {view.milestones.map((milestone) => (
              <th key={milestone.id} className="px-3 py-2 font-semibold">
                {milestone.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payers.map((member) => {
            const party = view.parties.find((item) => item.payerUserId === member.userId);
            const showParty = party && party.travelers.length > 1;
            return (
            <tr key={member.userId} className="border-t border-line">
              <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium">
                {member.name}
                {showParty ? <span className="block text-xs font-normal text-muted">{party.name} · {party.travelers.length} people</span> : null}
              </th>
              {view.milestones.map((milestone) => (
                <td key={milestone.id} className="px-3 py-2">
                  <Cell member={member} milestoneId={milestone.id} honoree={member.role === "honoree"} />
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

function Cell({ member, milestoneId, honoree }: { member: MemberView; milestoneId: string; honoree: boolean }) {
  if (honoree) return <span className="text-xs text-muted">Waived</span>;
  if (member.status === "off_trip" && !member.lines.some((line) => line.milestoneId === milestoneId)) {
    return <span className="text-xs text-muted">Off trip</span>;
  }
  const line = member.lines.find((item) => item.milestoneId === milestoneId);
  if (!line || (line.amountCents === 0 && line.status !== "paid" && line.status !== "forfeited" && line.status !== "refunded")) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <span className={`ft-chip flex-col !items-start !gap-0 py-1 !leading-tight ${tone[line.status] ?? tone.due}`}>
      <span className="uppercase tracking-[0.06em]">{paymentStatusLabel(line.status)}</span>
      <span className="tabular-nums">{money(line.amountCents)}</span>
    </span>
  );
}
