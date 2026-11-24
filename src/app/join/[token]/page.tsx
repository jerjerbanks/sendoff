import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { joinTripAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { ogCard } from "@/lib/og-copy";
import { ensureDemoSeed, tripIdForToken } from "@/lib/store";
import { loadTripView } from "@/lib/view";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  await ensureDemoSeed();
  const tripId = await tripIdForToken(token);
  const shell = tripId ? await loadTripView(tripId, null) : null;
  const payer = shell?.members.find((member) => member.status === "committed" && member.role !== "honoree");
  const view = payer && tripId ? await loadTripView(tripId, payer.userId) : shell;
  if (!view) return { title: "Sendoff invite" };
  const card = ogCard(view);
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:4747";
  const image = `${proto}://${host}/og/invite/${token}`;
  return {
    title: card.alt,
    description: card.alt,
    openGraph: { title: card.title, description: card.alt, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: card.title, description: card.alt, images: [image] },
  };
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  await ensureDemoSeed();
  const tripId = await tripIdForToken(token);
  const view = tripId ? await loadTripView(tripId, null) : null;
  const closed = !!view && (view.lockedIn || view.underMinimum || view.cancelled);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Sendoff</p>
      {view ? (
        <>
          <h1 className="mt-2 font-serif text-4xl leading-tight">{view.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {view.organizerName} is planning a bachelor party for {view.guestName}. {view.dateWindow}. This is a mock
            login — the phone or email is just how we recognize you next time.
          </p>
          <p className="mt-3 text-sm">
            {view.payerCount} payers committed · {view.members.filter((member) => member.status === "joined").length} still deciding
          </p>
          {closed ? (
            <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
              The buy-in deadline has passed. You can&apos;t join or rejoin.
            </p>
          ) : (
            <form action={joinTripAction} className="mt-6 grid gap-3 rounded-3xl border border-line bg-card p-4">
              <input type="hidden" name="token" value={token} />
              {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
              <label className="text-sm font-medium">
                Your name
                <Input className="mt-1.5" name="name" required placeholder="Taylor Nguyen" />
              </label>
              <label className="text-sm font-medium">
                Phone or email
                <Input className="mt-1.5" name="contact" required placeholder="taylor@example.com" />
              </label>
              <SubmitButton>Join the trip</SubmitButton>
            </form>
          )}
        </>
      ) : (
        <>
          <h1 className="mt-2 font-serif text-4xl">That invite doesn&apos;t go anywhere.</h1>
          <p className="mt-3 text-sm text-muted">Check the link, or start from the demo.</p>
        </>
      )}
      <Link href="/" className="mt-6 text-sm font-semibold text-accent">
        Back to Sendoff
      </Link>
    </main>
  );
}
