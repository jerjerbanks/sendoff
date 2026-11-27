import type { Metadata } from "next";
import Link from "next/link";
import { DemoTourFrame } from "@/components/demo-tour-frame";
import { ThemeIcon } from "@/components/theme-icon";
import { sceneUrl, themeTileScene } from "@/lib/scenes";
import { THEME_INFO } from "@/lib/trip-theme";

export const metadata: Metadata = { title: "Sample trip: not just golf" };

const STILLS = [
  { theme: "beach" as const, caption: "A family beach week" },
  { theme: "ski" as const, caption: "A ski weekend" },
];

/** The golf tour's closer: a flash of two other looks, then the family tour or a real trip. */
export default function DemoCloser() {
  return (
    <DemoTourFrame n={9}>
      <h1 className="ft-h1 mt-8 text-[40px]">
        Same app,
        <br />
        <i>any trip.</i>
      </h1>
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {STILLS.map((still) => (
          <li key={still.theme} data-trip-theme={still.theme} className="ft-panel overflow-hidden">
            <span className="block aspect-[4/5] bg-cover bg-center" style={{ backgroundImage: `url(${sceneUrl(themeTileScene(still.theme))})` }} aria-hidden />
            <span className="block p-3">
              <span className="ft-chip ft-chip-theme">
                <ThemeIcon theme={still.theme} size={16} />
                <span className="truncate">{THEME_INFO[still.theme].name}</span>
              </span>
              <span className="mt-1.5 block text-[15px] font-semibold">{still.caption}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
        <a href="/demo/10" className="ft-btn">
          <span>See the family lake trip</span>
        </a>
        <Link href="/new#start" className="ft-link justify-self-start">
          Start your own trip
        </Link>
      </div>
    </DemoTourFrame>
  );
}
