"use client";

import { useEffect, useState } from "react";
import { ShareButton } from "@/components/share-button";
import { shareDraft, shareMoment, smsHref, type ShareMoment, type ShareTrip } from "@/lib/share-copy";

export function ShareLauncher({ origin, view }: { origin: string; view: ShareTrip }) {
  const [moment, setMoment] = useState<ShareMoment>("invite");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("resplit") === "1" ? "resplit" : shareMoment(window.location.pathname);
    setMoment(next);
  }, []);

  const draft = shareDraft(view, moment, origin);
  const label =
    moment === "vote" ? "Vote now" : moment === "commit" ? "Commit reminder" : moment === "resplit" ? "New share" : "Invite";

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <ShareButton title={draft.title} text={draft.text} url={draft.url} smsHref={smsHref(draft.text, draft.url)} />
    </div>
  );
}
