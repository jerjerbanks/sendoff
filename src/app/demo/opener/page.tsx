import type { Metadata } from "next";
import { DemoTourFrame } from "@/components/demo-tour-frame";

export const metadata: Metadata = { title: "Sample trip: the group chat" };

/** A made-up group chat: the problem the golf demo solves. Nothing here is real or stored. */
const CHAT: { who: string; text: string; me?: boolean }[] = [
  { who: "Marcus Hale", text: "Found the house. Vista Ridge, Scottsdale, March 11–14. $3,600 for 3 nights.", me: true },
  { who: "Evan Brooks", text: "Dibs on the master 😤" },
  { who: "Marcus Hale", text: "I'll put the house on my card, just Venmo me", me: true },
  { who: "Jamal Wright", text: "I'm in. Bunk is fine, I'm cheap" },
  { who: "Ben Walsh", text: "Probably in, let me check" },
  { who: "Marcus Hale", text: "Ben? Kyle? Need to book this week", me: true },
];

export default function DemoOpener() {
  return (
    <DemoTourFrame n={1}>
      <section data-trip-theme="golf" className="mt-8" aria-label="A sample group chat">
        <p className="ft-lbl">Golf weekend 🏌️ · 8 people</p>
        <ul className="mt-3 grid gap-2">
          {CHAT.map((message, index) => (
            <li key={index} className={`flex ${message.me ? "justify-end" : "justify-start"}`}>
              <span className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${message.me ? "bg-accent text-accent-fg" : "border border-line bg-card"}`}>
                {message.me ? null : <span className="block text-xs font-semibold text-muted">{message.who}</span>}
                {message.text}
              </span>
            </li>
          ))}
        </ul>
        <p className="ft-meta mt-4 text-center">Kyle Brennan and Ben Walsh have gone quiet.</p>
      </section>
      <p className="ft-lead mt-8">
        This is the thing a trip app is for. Next: Marcus starts the trip instead, and nobody fronts the house.
      </p>
    </DemoTourFrame>
  );
}
