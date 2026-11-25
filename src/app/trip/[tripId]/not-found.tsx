import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function TripNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="ft-h1">No trip here.</h1>
      <p className="mt-2 text-sm text-muted">That link doesn&apos;t match a trip in this local database.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-clay-ink">
        Back to {APP_NAME}
      </Link>
    </main>
  );
}
