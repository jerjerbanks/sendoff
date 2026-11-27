import type { Metadata } from "next";
import { FeedbackButton } from "@/components/feedback-button";
import Link from "next/link";
import { redeemSignInLinkAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { signInLinkIsLive } from "@/lib/session";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign in · ${APP_NAME}`,
  // A personal link: keep it out of search engines and previews' indexes.
  robots: { index: false, follow: false },
};

/**
 * The page a one-time sign-in link opens. Opening it does not use the link (message
 * apps open links to build previews); tapping the button does.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ expired?: string }>;
}) {
  const { token } = await params;
  const { expired } = await searchParams;
  const live = !expired && (await signInLinkIsLive(token));
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{APP_NAME}</p>
      {live ? (
        <>
          <h1 className="mt-2 font-serif text-4xl leading-tight">Sign in on this phone?</h1>
          <p className="mt-3 text-base text-muted">
            This link signs this phone in as you. It works once and expires 15 minutes after you made it. Only tap if you made it yourself.
          </p>
          <form action={redeemSignInLinkAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <SubmitButton>Sign me in</SubmitButton>
          </form>
        </>
      ) : (
        <>
          <h1 className="mt-2 font-serif text-4xl leading-tight">This link has been used or has expired.</h1>
          <p className="mt-3 text-base text-muted">
            On the phone where you&apos;re signed in, open the trip, go to Your party, and make a new one. Joined with email? Sign in with a
            code instead.
          </p>
          <Link href="/signin" className="ft-btn mt-6 self-start">
            Sign in with email
          </Link>
        </>
      )}
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold text-accent">
        Go to {APP_NAME}
      </Link>
      <FeedbackButton className="mt-2 self-start" />
    </main>
  );
}
