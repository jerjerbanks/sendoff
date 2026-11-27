/** A quiet skeleton in the page's own shapes, so moving between trip pages never shows a blank screen. */
export default function LoadingTrip() {
  return (
    <div className="grid gap-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading the trip…</span>
      <div className="h-3 w-32 animate-pulse rounded bg-chip" aria-hidden />
      <div className="grid gap-2" aria-hidden>
        <div className="h-10 w-3/4 animate-pulse rounded-lg bg-chip" />
        <div className="h-10 w-1/2 animate-pulse rounded-lg bg-chip" />
      </div>
      <div className="h-4 w-full animate-pulse rounded bg-chip" aria-hidden />
      <div className="h-4 w-5/6 animate-pulse rounded bg-chip" aria-hidden />
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-20 w-full animate-pulse rounded-2xl bg-chip/70" aria-hidden />
      ))}
    </div>
  );
}
