"use client";

export default function TripError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="ft-panel p-4">
      <h2 className="ft-h2">Something broke while loading the trip.</h2>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <button className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
