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
        className="inline-flex h-12 items-center rounded-2xl border border-line bg-chip px-4 text-sm font-semibold text-ink"
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

/** Hands a personal link to the share sheet (AirDrop, notes, a text to yourself), or copies it. */
export function SendToSelfButton({ url }: { url: string }) {
  const [note, setNote] = useState("");

  async function send() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Sign in to Field Trip", url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Copied. Paste it on your other phone.");
    } catch {
      setNote("Copy the link above by hand.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void send()}
        className="inline-flex h-12 items-center rounded-2xl border border-line bg-chip px-4 text-sm font-semibold text-ink"
      >
        Send it to my other phone
      </button>
      {note ? <p className="w-full text-xs text-muted">{note}</p> : null}
    </div>
  );
}
