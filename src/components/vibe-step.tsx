"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeIcon } from "@/components/theme-icon";
import { sceneUrl, themeTileScene } from "@/lib/scenes";
import { deriveTripTheme, THEME_INFO, vibeOrder, type TripTheme } from "@/lib/trip-theme";

/**
 * v7 "What's the vibe?" step, behind NEXT_PUBLIC_FT_VIBE_STEP (staging only).
 * PREVIEW ONLY: the create action has no existing field that would store a theme, so the choice
 * is not submitted (the radios belong to no form) and the trip renders its derived theme.
 * Storing it needs a trip.theme column, a follow-up that needs Jeremy's approval.
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
      <p className="text-sm text-muted">Sets the trip&apos;s look. Preview only for now: the trip picks its look from its name and type.</p>
      <div className="ft-tiles mt-1">
        {tiles.map((theme) => (
          <label key={theme} className="ft-vibe" data-trip-theme={theme}>
            {/* form="" keeps these out of the create form: nothing about the vibe is submitted. */}
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
