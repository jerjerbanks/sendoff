import Link from "next/link";
import { FeedbackButton } from "@/components/feedback-button";
import { APP_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="ft-h1">Nothing at this address.</h1>
      <Link href="/" className="mt-4 inline-block font-semibold text-accent-ink">
        Back to {APP_NAME}
      </Link>
      <div className="mt-4">
        <FeedbackButton />
      </div>
    </main>
  );
}
