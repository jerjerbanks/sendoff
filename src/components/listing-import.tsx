"use client";

import { useState } from "react";
import { importRoomsAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import {
  BED_TYPES,
  cleanImportRooms,
  countBedrooms,
  importBedLabel,
  isOptionalBed,
  parseSleepText,
  spotsPerBed,
  type ImportBedType,
  type ImportRoom,
} from "@/lib/listing-import";

type Stage =
  | { kind: "link" }
  | { kind: "paste"; why: string | null }
  | { kind: "confirm"; source: "link" | "paste"; bedrooms: number | null };

const FLOORS = ["Main level", "Upper level", "Lower level", "Upstairs", "Downstairs", "Basement", "Loft"];

/** Why the link didn't work, in words the organizer can act on. */
function failureText(reason: string | undefined): string {
  if (reason === "not_airbnb_link") return "That isn't an airbnb.com/rooms link, so paste the beds instead.";
  if (reason === "no_stops") return "That listing doesn't show where people sleep. Paste the beds from another source, or add them below.";
  return "Airbnb didn't let us read that listing. Paste the section instead.";
}

/**
 * S13 import: link → (paste fallback) → confirm → save. Nothing is saved until
 * the organizer presses "Add these rooms". The bed picker below this panel is
 * the last fallback.
 */
export function ListingImport({ tripId, existingRooms }: { tripId: string; existingRooms: string[] }) {
  const [stage, setStage] = useState<Stage>({ kind: "link" });
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [rooms, setRooms] = useState<ImportRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readLink() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/trip/${encodeURIComponent(tripId)}/import-listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        rooms?: ImportRoom[];
        bedrooms?: number | null;
        fallback?: string;
        reason?: string;
        error?: string;
      };
      if (data.ok && data.rooms?.length) {
        setRooms(data.rooms);
        setStage({ kind: "confirm", source: "link", bedrooms: data.bedrooms ?? null });
      } else if (data.fallback === "paste") {
        setStage({ kind: "paste", why: failureText(data.reason) });
      } else {
        setError(data.error ?? "That didn't work. Try again in a minute.");
      }
    } catch {
      setStage({ kind: "paste", why: failureText(undefined) });
    } finally {
      setBusy(false);
    }
  }

  function readPaste() {
    const found = parseSleepText(pasted);
    if (found.length === 0) {
      setError("No beds found. Copy from the “Where you’ll sleep” heading down to the last bed, or add beds one at a time below.");
      return;
    }
    setError(null);
    setRooms(found);
    setStage({ kind: "confirm", source: "paste", bedrooms: null });
  }

  const updateRoom = (index: number, patch: Partial<ImportRoom>) =>
    setRooms((current) => current.map((room, i) => (i === index ? { ...room, ...patch } : room)));
  const updateBed = (roomIndex: number, bedIndex: number, patch: Partial<{ type: ImportBedType; count: number }>) =>
    updateRoom(roomIndex, { beds: rooms[roomIndex].beds.map((bed, i) => (i === bedIndex ? { ...bed, ...patch } : bed)) });

  const startOver = () => {
    setStage({ kind: "link" });
    setRooms([]);
    setError(null);
  };

  if (stage.kind !== "confirm") {
    return (
      <section className="ft-panel grid gap-3 p-4">
        <div>
          <h3 className="ft-h2">Import from Airbnb</h3>
          <p className="ft-meta mt-1">Paste the listing link. You&rsquo;ll check every room before anything is added.</p>
        </div>
        {stage.kind === "link" ? (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (url.trim()) void readLink();
            }}
          >
            <input
              className={fieldClass}
              type="url"
              inputMode="url"
              placeholder="https://www.airbnb.com/rooms/…"
              aria-label="Airbnb listing link"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={busy || !url.trim()}>
              {busy ? "Reading the listing…" : "Read listing"}
            </Button>
            <button type="button" className="ft-link justify-self-start text-sm" onClick={() => setStage({ kind: "paste", why: null })}>
              VRBO or another site? Paste the beds instead
            </button>
          </form>
        ) : (
          <div className="grid gap-2">
            {stage.why ? <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{stage.why}</p> : null}
            <label className="text-sm font-medium" htmlFor="sleep-text">
              Paste the &lsquo;Where you&rsquo;ll sleep&rsquo; text
            </label>
            <textarea
              id="sleep-text"
              className={`${fieldClass} h-40 py-3`}
              placeholder={"Bedroom 1\n1 king bed\nBedroom 2\n2 single beds"}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
            <Button type="button" variant="secondary" disabled={!pasted.trim()} onClick={readPaste}>
              Read text
            </Button>
            <button type="button" className="ft-link justify-self-start text-sm" onClick={startOver}>
              Try a link instead
            </button>
          </div>
        )}
        {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
        <p className="ft-meta">Or add beds one at a time below.</p>
      </section>
    );
  }

  const parsedBedrooms = countBedrooms(rooms);
  const mismatch = stage.bedrooms !== null && stage.bedrooms !== parsedBedrooms;
  const taken = new Set(existingRooms.map((name) => name.toLowerCase()));
  const spots = rooms.reduce((sum, room) => sum + room.beds.reduce((n, bed) => n + (bed.type === "crib" ? 0 : bed.count * spotsPerBed(bed.type)), 0), 0);
  const check = cleanImportRooms(rooms);
  const clash = rooms.find((room) => taken.has(room.room.trim().toLowerCase()));

  return (
    <section className="ft-panel grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ft-lbl accent">Check before adding</p>
          <h3 className="ft-h2 mt-1">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"}, {spots} {spots === 1 ? "spot" : "spots"}
          </h3>
        </div>
        <button type="button" className="ft-link text-sm" onClick={startOver}>
          Start over
        </button>
      </div>

      {mismatch ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          The listing says {stage.bedrooms} {stage.bedrooms === 1 ? "bedroom" : "bedrooms"}, but we found {parsedBedrooms}. Add or remove rooms so it matches
          the house.
        </p>
      ) : null}

      <ul className="grid gap-3">
        {rooms.map((room, roomIndex) => (
          <li key={roomIndex} className="grid gap-2 rounded-2xl bg-chip/60 p-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                className={fieldClass}
                aria-label="Room name"
                value={room.room}
                maxLength={60}
                onChange={(event) => updateRoom(roomIndex, { room: event.target.value })}
              />
              <button
                type="button"
                className="ft-btn2 h-[52px] px-3 text-sm"
                aria-label={`Remove ${room.room || "room"}`}
                onClick={() => setRooms((current) => current.filter((_, i) => i !== roomIndex))}
              >
                Remove
              </button>
            </div>
            {taken.has(room.room.trim().toLowerCase()) ? <p className="text-xs text-bad">There&rsquo;s already a room with this name. Rename it.</p> : null}
            <label className="text-sm font-medium">
              Floor
              <input
                className={`${fieldClass} mt-1`}
                list="import-floors"
                placeholder="Not set"
                maxLength={30}
                value={room.floor ?? ""}
                onChange={(event) => updateRoom(roomIndex, { floor: event.target.value || null })}
              />
            </label>
            <ul className="grid gap-2">
              {room.beds.map((bed, bedIndex) => (
                <li key={bedIndex} className="grid grid-cols-[72px_1fr_auto] items-center gap-2">
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    max={12}
                    aria-label="How many"
                    value={bed.count}
                    onChange={(event) => updateBed(roomIndex, bedIndex, { count: Math.max(1, Math.min(12, Number(event.target.value) || 1)) })}
                  />
                  <select
                    className={fieldClass}
                    aria-label="Bed type"
                    value={bed.type}
                    onChange={(event) => updateBed(roomIndex, bedIndex, { type: event.target.value as ImportBedType })}
                  >
                    {BED_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {importBedLabel(type, bed.count)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="ft-link px-1 text-sm"
                    aria-label="Remove bed"
                    onClick={() => updateRoom(roomIndex, { beds: room.beds.filter((_, i) => i !== bedIndex) })}
                  >
                    ✕
                  </button>
                  {bed.type === "bunk" || isOptionalBed(bed.type) ? (
                    <p className="col-span-3 -mt-1 flex flex-wrap gap-1.5">
                      {bed.type === "bunk" ? <span className="ft-chip lake">Sleeps {bed.count * 2}</span> : null}
                      {isOptionalBed(bed.type) ? <span className="ft-chip sun">Optional</span> : null}
                      {bed.type === "crib" ? <span className="ft-meta self-center">Marks the room as having crib space; not a bed.</span> : null}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="ft-link justify-self-start text-sm"
              onClick={() => updateRoom(roomIndex, { beds: [...room.beds, { type: "queen", count: 1 }] })}
            >
              + Add a bed
            </button>
          </li>
        ))}
      </ul>
      <datalist id="import-floors">
        {FLOORS.map((floor) => (
          <option key={floor} value={floor} />
        ))}
      </datalist>

      <button
        type="button"
        className="ft-btn2 text-sm"
        onClick={() => setRooms((current) => [...current, { room: `Room ${current.length + 1}`, floor: null, beds: [{ type: "queen", count: 1 }] }])}
      >
        + Add a room
      </button>

      <p className="ft-meta">
        Sofa beds and air mattresses are added as cheap spots (0.6 and 0.5); remove them if nobody will use them. Bunks count as two spots. You can set
        private baths, holds and weights on each room after.
      </p>

      {!check.ok && rooms.length > 0 ? <p className="text-sm text-bad">{check.error}</p> : null}
      <form action={importRoomsAction}>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="source" value={stage.source} />
        <input type="hidden" name="rooms" value={JSON.stringify(rooms)} />
        <SubmitButton pendingLabel="Adding rooms…" disabled={!check.ok || !!clash}>
          {!check.ok || clash ? "Fix the rooms above" : rooms.length === 1 ? "Add this room" : `Add these ${rooms.length} rooms`}
        </SubmitButton>
      </form>
    </section>
  );
}
