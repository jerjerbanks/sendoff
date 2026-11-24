import { money } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/labels";
import type { MemberView, TripView } from "@/lib/view";

const tone: Record<string, string> = {
  paid: "bg-good-soft text-good",
  due: "bg-chip text-ink",
  late: "bg-warn-soft text-warn",
  forfeited: "bg-bad-soft text-bad",
  refunded: "bg-chip text-muted",
};

export function PaymentGrid({ view }: { view: TripView }) {
  if (view.milestones.length === 0) {
    return <p className="text-sm text-muted">Payments show up once the organizer opens buy-in.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead className="bg-chip text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="sticky left-0 bg-chip px-3 py-2 font-semibold">Who</th>
            {view.milestones.map((milestone) => (
              <th key={milestone.id} className="px-3 py-2 font-semibold">
                {milestone.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.members.map((member) => (
            <tr key={member.userId} className="border-t border-line">
              <th className="sticky left-0 bg-card px-3 py-2 text-left font-medium">{member.name}</th>
              {view.milestones.map((milestone) => (
                <td key={milestone.id} className="px-3 py-2">
                  <Cell member={member} milestoneId={milestone.id} honoree={member.role === "honoree"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ member, milestoneId, honoree }: { member: MemberView; milestoneId: string; honoree: boolean }) {
  if (honoree) return <span className="text-xs text-muted">Covered</span>;
  if (member.status === "off_trip" && !member.lines.some((line) => line.milestoneId === milestoneId)) {
    return <span className="text-xs text-muted">Off</span>;
  }
  const line = member.lines.find((item) => item.milestoneId === milestoneId);
  if (!line || (line.amountCents === 0 && line.status !== "paid" && line.status !== "forfeited" && line.status !== "refunded")) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tone[line.status] ?? tone.due}`}>
      {paymentStatusLabel(line.status)} {money(line.amountCents)}
    </span>
  );
}
