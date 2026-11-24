import Link from "next/link";

export default function TripNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-serif text-4xl">No trip here.</h1>
      <p className="mt-2 text-sm text-muted">That link doesn&apos;t match a trip in this local database.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-accent">
        Back to Sendoff
      </Link>
    </main>
  );
}
