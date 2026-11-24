import { notFound } from "next/navigation";

const screens = ["join", "vote", "share", "commit", "dashboard"] as const;
type Screen = (typeof screens)[number];
type Direction = "playful" | "premium";

export default async function MockupPage({
  params,
}: {
  params: Promise<{ direction: string; screen: string }>;
}) {
  const { direction, screen } = await params;
  if ((direction !== "playful" && direction !== "premium") || !screens.includes(screen as Screen)) notFound();
  return (
    <main className="min-h-dvh" style={{ background: direction === "playful" ? "#fff4ea" : "#0c0b0a" }}>
      <Phone direction={direction} screen={screen as Screen} />
    </main>
  );
}

function Phone({ direction, screen }: { direction: Direction; screen: Screen }) {
  const playful = direction === "playful";
  const ink = playful ? "#1a120c" : "#f6f1e8";
  const paper = playful ? "#ffe14a" : "#161311";
  const card = playful ? "#fffdf8" : "#221c18";
  const accent = playful ? "#ff2f78" : "#e4c48a";
  const muted = playful ? "#5c4636" : "#b3a89c";
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[390px] px-4 py-6" style={{ color: ink, background: paper, fontFamily: playful ? "ui-rounded, system-ui, sans-serif" : "Georgia, ui-serif, serif" }}>
      <p className="text-[11px] font-bold tracking-[0.22em]" style={{ color: accent }}>{playful ? "SENDOFF" : "SENDOFF"}</p>
      {screen === "join" ? <Join playful={playful} card={card} accent={accent} muted={muted} /> : null}
      {screen === "vote" ? <Vote playful={playful} card={card} accent={accent} muted={muted} ink={ink} /> : null}
      {screen === "share" ? <Share playful={playful} card={card} accent={accent} muted={muted} ink={ink} /> : null}
      {screen === "commit" ? <Commit playful={playful} card={card} accent={accent} muted={muted} ink={ink} /> : null}
      {screen === "dashboard" ? <Dash playful={playful} card={card} accent={accent} muted={muted} ink={ink} /> : null}
    </div>
  );
}

function Join({ playful, card, accent, muted }: Omit<Face, "ink">) {
  return (
    <>
      <h1 className="mt-4 text-5xl leading-[0.95]" style={{ fontWeight: playful ? 800 : 500 }}>Alex&apos;s weekend is on.</h1>
      <p className="mt-3 text-base leading-relaxed" style={{ color: muted }}>Chris sent this from the group chat. You&apos;re one tap from the plan. No app to install.</p>
      <div className="mt-6 rounded-3xl p-4" style={{ background: card, border: playful ? "3px solid #1a120c" : "1px solid #3a322c", transform: playful ? "rotate(-1deg)" : undefined }}>
        <p className="text-sm font-semibold">Your name</p>
        <div className="mt-2 rounded-2xl px-3 py-3 text-sm" style={{ background: playful ? "#fff4ea" : "#100e0c", color: muted }}>Taylor Nguyen</div>
        <button className="mt-3 w-full rounded-2xl py-3 text-base font-bold" style={{ background: accent, color: playful ? "#1a120c" : "#1a120c" }} type="button">I&apos;m in the chat</button>
      </div>
      <p className="mt-4 text-sm" style={{ color: muted }}>4 of 8 already said they&apos;re coming.</p>
    </>
  );
}

function Vote({ playful, card, accent, muted, ink }: Face) {
  const options = [
    ["Nashville", "Fits everyone", true],
    ["Austin", "Fits everyone", false],
    ["Scottsdale", "Fits everyone", false],
    ["Cabo", "Fits most", false],
  ] as const;
  return (
    <>
      <h1 className="mt-4 text-4xl leading-none" style={{ fontWeight: playful ? 800 : 500 }}>Where are we going?</h1>
      <p className="mt-2 text-sm" style={{ color: muted }}>Tap anything you&apos;d actually do. Nobody sees your budget.</p>
      <div className="mt-5 grid gap-3">
        {options.map(([label, fit, on]) => (
          <div key={label} className="rounded-3xl px-4 py-3" style={{ background: on ? accent : card, color: on ? "#1a120c" : ink, border: playful ? "3px solid #1a120c" : "1px solid #3a322c" }}>
            <p className="text-xl font-semibold">{label}</p>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: on ? "#1a120c" : muted }}>{fit}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Share({ playful, card, accent, muted }: Face) {
  return (
    <>
      <h1 className="mt-4 text-4xl leading-none" style={{ fontWeight: playful ? 800 : 500 }}>Your number</h1>
      <p className="mt-2 text-sm" style={{ color: muted }}>If five of you commit. Flights are a range.</p>
      <p className="mt-6 text-6xl" style={{ fontWeight: playful ? 800 : 500 }}>$1,248–$1,308</p>
      <p className="text-sm" style={{ color: muted }}>midpoint $1,278 · buy-in is part of this</p>
      <div className="mt-5 rounded-3xl p-4 text-sm" style={{ background: card, border: playful ? "3px solid #1a120c" : "1px solid #3a322c" }}>
        <Row label="Lodging, your bed" value="$699" />
        <Row label="House + Alex&apos;s flight" value="$178" />
        <Row label="Tee times" value="$120" />
        <Row label="Your flight" value="$250–$310" />
      </div>
      <p className="mt-4 text-sm" style={{ color: accent }}>One more person saves you $136.</p>
    </>
  );
}

function Commit({ playful, card, accent, muted, ink }: Face) {
  return (
    <>
      <h1 className="mt-4 text-4xl leading-none" style={{ fontWeight: playful ? 800 : 500 }}>Commit by Dec 15</h1>
      <p className="mt-6 text-6xl" style={{ fontWeight: playful ? 800 : 500 }}>$150</p>
      <p className="text-sm" style={{ color: muted }}>The first slice of your share. Not a fee on top.</p>
      <div className="mt-5 rounded-3xl p-4 text-sm leading-relaxed" style={{ background: card, color: ink, border: playful ? "3px solid #1a120c" : "1px solid #3a322c" }}>
        You get it back if the stay is never booked. After Chris books the house, dropping means this stays with the trip.
      </div>
      <button className="mt-4 w-full rounded-2xl py-4 text-lg font-bold" style={{ background: accent, color: "#1a120c" }} type="button">Pay $150 (test)</button>
      <p className="mt-2 text-center text-xs" style={{ color: muted }}>Test payment. No card is charged.</p>
    </>
  );
}

function Dash({ playful, card, accent, muted, ink }: Face) {
  return (
    <>
      <div className="mt-4 flex items-end justify-between">
        <h1 className="text-4xl leading-none" style={{ fontWeight: playful ? 800 : 500 }}>Nashville</h1>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: accent, color: "#1a120c" }}>4 of 8</span>
      </div>
      <p className="mt-2 text-sm" style={{ color: muted }}>Bachelor party for Alex · commit by Dec 15</p>
      <div className="mt-5 rounded-3xl p-4" style={{ background: card, border: playful ? "3px solid #1a120c" : "1px solid #3a322c" }}>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: muted }}>Your share if 5 commit</p>
        <p className="mt-1 text-4xl" style={{ fontWeight: playful ? 800 : 500 }}>$1,278</p>
        <p className="text-sm" style={{ color: accent }}>$1,248–$1,308 with your flight</p>
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {["Chris · committed", "Sam · committed", "Taylor · not yet", "Alex · guest of honor"].map((row) => (
          <li key={row} className="rounded-2xl px-3 py-2" style={{ background: card, color: ink }}>{row}</li>
        ))}
      </ul>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between py-1">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}

type Face = { playful: boolean; card: string; accent: string; muted: string; ink: string };
