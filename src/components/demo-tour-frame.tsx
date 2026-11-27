import Link from "next/link";
import type { ReactNode } from "react";
import { TOUR, tourStep } from "@/lib/demo-tour";
import { Wordmark } from "@/components/wordmark";

/**
 * The tour's frame for the two demo screens that aren't trip pages (the group-chat
 * opener and the theme closer): step, who you are, what to notice, Back and Next.
 */
export function DemoTourFrame({ n, children }: { n: number; children: ReactNode }) {
  const step = tourStep(n);
  const total = TOUR.length;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <div className="sticky top-0 z-30 border-b border-line-strong bg-chip px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="ft-lbl accent">Demo · Step {n} of {total}</p>
          <Link href="/" className="text-xs font-semibold text-muted">
            Exit demo
          </Link>
        </div>
        {step ? (
          <>
            <p className="ft-h2 mt-1 leading-tight">{step.goal}</p>
            <p className="mt-1 text-sm text-muted">{step.why}</p>
          </>
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          {n > 1 ? (
             
            <a href={`/demo/${n - 1}`} className="inline-flex h-10 items-center rounded-sm border border-line px-4 text-sm font-semibold">
              Back
            </a>
          ) : null}
          {n < total ? (
             
            <a href={`/demo/${n + 1}`} className="ml-auto inline-flex h-10 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-fg">
              Next step →
            </a>
          ) : null}
        </div>
      </div>
      <main className="flex-1 px-5 pt-6 pb-16">
        <Wordmark />
        {children}
      </main>
    </div>
  );
}
