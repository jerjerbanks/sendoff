import Link from "next/link";

/** A member who opens an organizer-only page gets a headed explanation and a way back, never a near-blank page. */
export function OrganizerOnly({ tripId, what }: { tripId: string; what: string }) {
  return (
    <section className="ft-panel p-5">
      <h1 className="ft-h1">Organizer only</h1>
      <p className="ft-lead mt-2">Only the organizer {what}. Your own steps are on the Plan and the tabs below.</p>
      <Link href={`/trip/${tripId}`} className="ft-btn mt-5">
        <span>Back to the plan</span>
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
