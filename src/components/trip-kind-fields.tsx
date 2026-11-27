"use client";

import { useEffect, useState } from "react";
import { Input, fieldClass } from "@/components/ui/input";
import { SUB_TYPES, isWeddingSubType } from "@/lib/trip-kind";
import { VibeStep } from "@/components/vibe-step";

/**
 * Adult or Family, a sub-type for either, and guests of honor only for the wedding sub-types.
 * The honoree block is hidden by CSS (`.ft-honorees`, see globals.css) so it shows and hides
 * live even before hydration or with no JavaScript; once hydrated it is also disabled while
 * hidden, so its fields never submit. The server ignores them for non-wedding types anyway.
 */
export function TripKindFields({ children }: { children?: React.ReactNode }) {
  const [subType, setSubType] = useState<string>("none");
  const [kind, setKind] = useState<string>("adult");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const wedding = isWeddingSubType(subType);
  const option = "flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 py-3 has-[:checked]:border-accent";
  return (
    <>
      <fieldset className="grid gap-2 text-sm">
        <legend className="font-medium">What kind of trip</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={option}>
            <input type="radio" name="tripKind" value="adult" defaultChecked onChange={() => setKind("adult")} />
            Adult
          </label>
          <label className={option}>
            <input type="radio" name="tripKind" value="family" onChange={() => setKind("family")} />
            Family
          </label>
        </div>
        <label className="mt-1 block text-sm font-medium">
          Type
          <select className={`${fieldClass} mt-1.5`} name="subType" defaultValue="none" onChange={(event) => setSubType(event.target.value)}>
            {SUB_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <VibeStep kind={kind} subType={subType} />
      {children}
      <fieldset className="ft-honorees grid gap-3" disabled={hydrated && !wedding} hidden={hydrated && !wedding}>
        <legend className="text-sm font-medium">Guests of honor (optional — leave blank for none)</legend>
        <p className="text-sm text-muted">They come along, the group covers their share, and they can&apos;t be dropped. Name up to two here.</p>
        {[1, 2].map((index) => {
          const row = (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2 [&>*]:min-w-0">
              <Input name={`honoree${index}Name`} placeholder="Name" autoComplete="off" aria-label={`Guest of honor ${index}`} />
              <select
                key={`${subType}-${index}`}
                className={`${fieldClass} w-32`}
                name={`honoree${index}Role`}
                defaultValue={defaultHonoreeRole(subType, index)}
                aria-label={`Guest of honor ${index} role`}
              >
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
                <option value="other">Other</option>
              </select>
              <Input className="col-span-2" name={`honoree${index}Contact`} placeholder="Their phone or email (optional)" autoComplete="off" aria-label={`Guest of honor ${index} contact`} />
            </div>
          );
          return index === 1 ? (
            row
          ) : (
            <details key={index}>
              <summary className="ft-summary text-[15px] font-medium text-ink-2">Add a second guest of honor</summary>
              <div className="mt-2">{row}</div>
            </details>
          );
        })}
      </fieldset>
    </>
  );
}

/** Bachelorette starts at Bride, Bachelor at Groom, a joint party at Bride then Groom. */
export function defaultHonoreeRole(subType: string, index: number): "bride" | "groom" | "other" {
  if (subType === "bachelorette") return "bride";
  if (subType === "bachelor") return "groom";
  if (subType === "joint") return index === 1 ? "bride" : "groom";
  return "other";
}
