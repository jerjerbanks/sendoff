"use client";

export default function TripError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <h2 className="font-serif text-2xl">Something broke while loading the trip.</h2>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <button className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
