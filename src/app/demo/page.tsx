import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { ThemeIcon } from "@/components/theme-icon";
import { LAKE_TRIP_ID } from "@/lib/constants";
import { FAMILY_TOUR_START, GOLF_TOUR_START } from "@/lib/demo-tour";
import { sceneUrl, themeTileScene } from "@/lib/scenes";
import { THEME_INFO } from "@/lib/trip-theme";

export const metadata: Metadata = { title: "Sample trips" };

const TRIPS = [
  {
    theme: "golf" as const,
    start: GOLF_TOUR_START,
    name: "Scottsdale Golf Weekend",
    line: "Eight guys, one $3,600 house, four courses to vote on. Six buy in, two drop off, the house books.",
    length: "About 90 seconds",
  },
  {
    theme: "outdoors" as const,
    start: FAMILY_TOUR_START,
    name: "Harper Lake House",
    line: "Four households, ten people, kids and grandparents. Each family pays as one, and the four bills add up to the house.",
    length: "About 60 seconds",
  },
];

/** /demo: pick a sample trip. Golf is the default; the old family link lands on the family tour. */
export default async function DemoPicker({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const { trip } = await searchParams;
  if (trip === LAKE_TRIP_ID) redirect(`/demo/${FAMILY_TOUR_START}`);
  return (
    <main className="mx-auto w-full max-w-lg px-5 py-10">
      <Wordmark />
      <h1 className="ft-h1 mt-8 text-[44px]">
        Pick a
        <br />
        <i>sample trip.</i>
      </h1>
      <p className="ft-lead mt-3">Step through a real trip as the people on it. Prices are demo estimates, not quotes.</p>
      <ul className="mt-6 grid gap-4">
        {TRIPS.map((item, index) => (
          <li key={item.name} data-trip-theme={item.theme}>
            { }
            <a href={`/demo/${item.start}`} className="ft-panel block overflow-hidden">
              <span className="block aspect-[16/7] w-full bg-cover bg-center" style={{ backgroundImage: `url(${sceneUrl(themeTileScene(item.theme))})` }} aria-hidden />
              <span className="block p-4">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="ft-chip ft-chip-theme">
                    <ThemeIcon theme={item.theme} size={16} />
                    <span>{THEME_INFO[item.theme].name}</span>
                  </span>
                  {index === 0 ? <span className="ft-meta">Start here</span> : null}
                </span>
                <span className="mt-2 block text-[20px] font-semibold leading-snug">{item.name}</span>
                <span className="mt-1 block text-[15px] text-ink-2">{item.line}</span>
                <span className="ft-meta mt-2 block">{item.length} →</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <Link href="/new#start" className="ft-link mt-6 inline-block">
        Or start your own trip
      </Link>
    </main>
  );
}
