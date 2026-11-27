import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requestSignInCodeAction, verifySignInCodeAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { FeedbackButton } from "@/components/feedback-button";
import { Turnstile } from "@/components/turnstile";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME, SIGN_IN_TICKET_COOKIE } from "@/lib/constants";
import { CODE_MINUTES, safeNext } from "@/lib/sign-in-code";
import { plausibleToken } from "@/lib/tokens";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: `Sign in · ${APP_NAME}`,
  robots: { index: false, follow: false },
};

/**
 * Sign in with an emailed code: for someone on a new phone, a cleared browser, or a
 * laptop. Step one asks for the email; step two (this browser holds the ticket cookie)
 * asks for the code. The copy never says whether an email is on a trip.
 */
export default async function SignInWithEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string; next?: string }>;
}) {
  const { step, error, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const hasTicket = plausibleToken((await cookies()).get(SIGN_IN_TICKET_COOKIE)?.value);
  const askingForCode = step === "code" && hasTicket;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <Link href="/" className="self-start" aria-label={`${APP_NAME} home`}>
        <Wordmark />
      </Link>
      {askingForCode ? (
        <>
          <h1 className="ft-display mt-8">
            Check your <i>email.</i>
          </h1>
          <p className="ft-lead mt-4">
            If that email is on a trip, a 6-digit code is on its way. It works in this browser for {CODE_MINUTES} minutes. Check spam if
            it&apos;s not there in a minute.
          </p>
          <form action={verifySignInCodeAction} className="mt-6 grid gap-3 ft-panel p-4">
            <input type="hidden" name="next" value={next} />
            {error ? (
              <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            ) : null}
            <label className="text-sm font-medium">
              Sign-in code
              <Input
                className="mt-1.5 font-mono text-lg tracking-[0.3em]"
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 -]{6,9}"
                maxLength={9}
                placeholder="123456"
                enterKeyHint="go"
              />
            </label>
            <SubmitButton pendingLabel="Checking…">Sign in</SubmitButton>
          </form>
          <Link href={next === "/trips" ? "/signin" : `/signin?next=${encodeURIComponent(next)}`} className="ft-link mt-4 self-start">
            Use a different email or send a new code
          </Link>
        </>
      ) : (
        <>
          <h1 className="ft-display mt-8">
            Sign <i>in.</i>
          </h1>
          <p className="ft-lead mt-4">Type the email you joined a trip with. We&apos;ll send a 6-digit code. No password.</p>
          <form action={requestSignInCodeAction} className="mt-6 grid gap-3 ft-panel p-4">
            <input type="hidden" name="next" value={next} />
            {error ? (
              <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            ) : null}
            <label className="text-sm font-medium">
              Email
              <Input
                className="mt-1.5"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
            </label>
            <Turnstile siteKey={turnstileSiteKey()} />
            <SubmitButton pendingLabel="Sending…">Email me a code</SubmitButton>
            <p className="text-xs text-muted">
              Joined with a phone number instead? Open the trip on that phone, go to Your party, and tap “Sign in on another phone.”
            </p>
          </form>
        </>
      )}
      <FeedbackButton className="mt-6 self-start" />
    </main>
  );
}
