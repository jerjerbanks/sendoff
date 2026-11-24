import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-serif text-4xl">Nothing at this address.</h1>
      <Link href="/" className="mt-4 inline-block font-semibold text-accent">
        Back to Sendoff
      </Link>
    </main>
  );
}
