"use client";

import { useEffect, useState } from "react";
import { switchUserAction } from "@/app/actions";
import { roleLabel } from "@/lib/labels";

export function Identify({
  tripId,
  members,
  hasViewer,
}: {
  tripId: string;
  hasViewer: boolean;
  members: { userId: string; name: string; role: "organizer" | "member" | "honoree"; party: string | null }[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("who") === "1" || !hasViewer) setOpen(true);
  }, [hasViewer]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-3 md:items-center md:justify-center">
      <div className="w-full max-w-lg rounded-3xl bg-card p-4 shadow-xl">
        <p className="ft-lbl action">Who are you?</p>
        <h2 className="mt-1 ft-h1">One tap, then you&apos;re in.</h2>
        <p className="mt-1 text-sm text-muted">This is a mock login so the group chat link knows which share to show.</p>
        <div className="mt-4 grid gap-2">
          {members.map((member) => (
            <form key={member.userId} action={switchUserAction}>
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="userId" value={member.userId} />
              <button className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-line px-3 py-3 text-left" type="submit">
                <span className="font-semibold">{member.name}</span>
                <span className="text-xs text-muted">
                  {member.party && !member.name.startsWith(member.party) ? `${member.party} · ` : ""}
                  {roleLabel(member.role)}
                </span>
              </button>
            </form>
          ))}
        </div>
        {hasViewer ? (
          <button className="mt-3 text-sm font-semibold text-muted" type="button" onClick={() => setOpen(false)}>
            Stay as I am
          </button>
        ) : null}
      </div>
    </div>
  );
}
