"use client";

import { useState } from "react";
import { Input, fieldClass } from "@/components/ui/input";
import { ADULT_OCCASIONS, isWeddingOccasion, type TripKind } from "@/lib/trip-kind";

/** Adult or Family, the occasion for adult trips, and guests of honor only for wedding occasions. */
export function TripKindFields({ children }: { children?: React.ReactNode }) {
  const [kind, setKind] = useState<TripKind>("adult");
  const [occasion, setOccasion] = useState<string>("none");
  const wedding = isWeddingOccasion(kind, occasion);
  const option = "flex min-h-12 items-center gap-2 rounded-xl border border-line px-3 py-3 has-[:checked]:border-clay";
  return (
    <>
      <fieldset className="grid gap-2 text-sm">
        <legend className="font-medium">What kind of trip</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={option}>
            <input type="radio" name="tripKind" value="adult" checked={kind === "adult"} onChange={() => setKind("adult")} />
            Adult
          </label>
          <label className={option}>
            <input type="radio" name="tripKind" value="family" checked={kind === "family"} onChange={() => setKind("family")} />
            Family
          </label>
        </div>
        {kind === "adult" ? (
          <label className="mt-1 block text-sm font-medium">
            Occasion
            <select className={`${fieldClass} mt-1.5`} name="occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)}>
              {ADULT_OCCASIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset>
      {children}
      {wedding ? <HonoreeFields /> : null}
    </>
  );
}

function HonoreeFields() {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Guests of honor (optional — leave blank for none)</legend>
      <p className="text-xs text-muted">They come along, the group covers their share, and they can&apos;t be dropped. Name up to two here.</p>
      {[1, 2].map((index) => {
        const row = (
          <div key={index} className="grid grid-cols-[1fr_auto] gap-2 [&>*]:min-w-0">
            <Input name={`honoree${index}Name`} placeholder="Name" aria-label={`Guest of honor ${index}`} />
            <select className={`${fieldClass} w-32`} name={`honoree${index}Role`} defaultValue="other" aria-label={`Guest of honor ${index} role`}>
              <option value="bride">Bride</option>
              <option value="groom">Groom</option>
              <option value="other">Other</option>
            </select>
            <Input className="col-span-2" name={`honoree${index}Contact`} placeholder="Their phone or email (optional)" aria-label={`Guest of honor ${index} contact`} />
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
  );
}
