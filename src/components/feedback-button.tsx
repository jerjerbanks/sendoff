import { FEEDBACK_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * "Send feedback" link to the tester form. Renders nothing while FEEDBACK_URL is empty,
 * so a half-done link never ships. Inline, never floating, so it can't cover the tab bar or CTAs.
 */
export function FeedbackButton({ className, url = FEEDBACK_URL }: { className?: string; url?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm font-semibold text-clay-ink underline-offset-4 hover:underline",
        className,
      )}
    >
      Send feedback
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M5 3h6v6M11 3 3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
