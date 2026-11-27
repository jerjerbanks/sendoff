"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeIcon } from "@/components/theme-icon";
import { sceneUrl, themeTileScene } from "@/lib/scenes";
import { deriveTripTheme, THEME_INFO, vibeOrder, type TripTheme } from "@/lib/trip-theme";

/**
 * v7 "What's the vibe?" step on /new.
 * The tiles are display radios outside the form. Only a tile the organizer actually taps is
 * posted, as the hidden "vibe" field, and saved on the trip (trips.theme, migration 0014).
 * Leaving the suggestion alone posts nothing, so the look keeps following the trip's name,
 * type and options as they change.
 */
export function VibeStep({ kind, subType }: { kind: string; subType: string }) {
  const root = useRef<HTMLFieldSetElement>(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<TripTheme | null>(null);

  // Read the trip name the organizer is typing from the surrounding form; nothing is fetched.
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const read = () => {
      const data = new FormData(form);
      setName([data.get("name"), data.get("dateWindow")].filter(Boolean).join(" "));
    };
    read();
    form.addEventListener("input", read);
    return () => form.removeEventListener("input", read);
  }, []);

  const suggested = deriveTripTheme({ type: kind, subType, name });
  const order = vibeOrder(kind, subType);
  const tiles = order.includes(suggested) ? order : [suggested, ...order];
  const current = picked && tiles.includes(picked) ? picked : suggested;

  return (
    <fieldset ref={root} className="grid gap-2">
      <legend className="text-sm font-medium">What&apos;s the vibe?</legend>
      <p className="text-sm text-muted">Sets the trip&apos;s look. Leave the suggestion and it follows the trip&apos;s name and plans. You can change it later in Settings.</p>
      <input type="hidden" name="vibe" value={picked && tiles.includes(picked) ? picked : ""} />
      <div className="ft-tiles mt-1">
        {tiles.map((theme) => (
          <label key={theme} className="ft-vibe" data-trip-theme={theme}>
            {/* Display-only radios kept out of the form; the hidden "vibe" field carries a real pick. */}
            <input type="radio" name="ft-vibe-preview" form="ft-vibe-preview-none" value={theme} checked={current === theme} onChange={() => setPicked(theme)} />
            <span className="ft-tile" style={{ backgroundImage: `url(${sceneUrl(themeTileScene(theme))})` }} aria-hidden />
            <span className="ft-chip ft-chip-theme absolute bottom-2 left-2">
              <ThemeIcon theme={theme} size={16} />
              <span className="truncate">{THEME_INFO[theme].vibeLabel}</span>
            </span>
            {theme === suggested ? <span className="ft-chip tag">Suggested</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
