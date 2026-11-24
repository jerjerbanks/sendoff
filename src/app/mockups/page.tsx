import Link from "next/link";

const screens = ["join", "vote", "share", "commit", "dashboard"] as const;

export default function MockupIndex() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-serif text-4xl">Mockups</h1>
      <p className="mt-2 text-sm text-muted">Static directions for the five screens a group chat lands on. The live app is unchanged.</p>
      {(["playful", "premium"] as const).map((direction) => (
        <section key={direction} className="mt-6">
          <h2 className="text-lg font-semibold capitalize">{direction}</h2>
          <ul className="mt-2 grid gap-2">
            {screens.map((screen) => (
              <li key={screen}>
                <Link className="text-accent font-semibold" href={`/mockups/${direction}/${screen}`}>{screen}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
