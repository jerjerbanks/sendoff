import Link from "next/link";
import { FeedbackButton } from "@/components/feedback-button";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME } from "@/lib/constants";

/** Any address that matches nothing. Branded, with a way back; it never names or hints at a trip. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <Link href="/" aria-label={`${APP_NAME} home`}>
        <Wordmark />
      </Link>
      <h1 className="ft-display mt-8">
        Nothing at
        <br />
        <i>this address.</i>
      </h1>
      <p className="ft-lead mt-4">The link may be mistyped or out of date. If someone sent you a trip, open their invite link again.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="ft-btn">
          <span>Go to {APP_NAME}</span>
          <span aria-hidden>→</span>
        </Link>
        <Link href="/trips" className="ft-link self-center">
          Your trips
        </Link>
      </div>
      <FeedbackButton className="mt-6" />
    </main>
  );
}
