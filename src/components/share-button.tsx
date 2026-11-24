"use client";

import { useState } from "react";

export function ShareButton({
  title,
  text,
  url,
  smsHref,
}: {
  title: string;
  text: string;
  url: string;
  smsHref: string;
}) {
  const [note, setNote] = useState("");

  async function share() {
    const payload = { title, text, url };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.location.href = smsHref;
    setNote("Opened your messages app with the text filled in.");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-card"
      >
        Send to group chat
      </button>
      <a className="text-sm font-semibold text-accent" href={smsHref}>
        Text it
      </a>
      {note ? <p className="w-full text-xs text-muted">{note}</p> : null}
    </div>
  );
}
