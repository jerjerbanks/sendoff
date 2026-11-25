import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingEnhance, LandingMenu } from "@/components/landing-client";
import { FeedbackButton } from "@/components/feedback-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME, SESSION_COOKIE } from "@/lib/constants";
import { landingDestination } from "@/lib/landing";
import { requestOrigin } from "@/lib/origin";
import { HERO_ART, LOWER } from "./landing-content";
import "./landing.css";
import "./landing-extra.css";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const words = APP_NAME.trim().split(/\s+/);
const lastWord = words.pop() ?? "";
const WORDMARK_HTML = words.length ? `${escapeHtml(words.join(" "))} <i>${escapeHtml(lastWord)}</i>` : escapeHtml(lastWord);

// Filled once per isolate, not per request: the landing page is two static strings.
const fill = (markup: string) => markup.replaceAll("%%WM%%", WORDMARK_HTML).replaceAll("%%APP%%", escapeHtml(APP_NAME));
const HERO_HTML = fill(HERO_ART);
const LOWER_HTML = fill(LOWER);

const TITLE = `${APP_NAME} — Get the trip out of the group chat`;
const DESCRIPTION = `One headcount, fair costs for every bed, and private budgets. ${APP_NAME} turns a group chat idea into a booked trip.`;

export async function generateMetadata(): Promise<Metadata> {
  // Absolute, per-request origin: a relative og:image resolves against localhost at build time.
  const origin = await requestOrigin();
  const image = `${origin}/landing/og.jpg`;
  return {
    metadataBase: new URL(origin),
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      type: "website",
      url: `${origin}/`,
      images: [{ url: image, width: 1200, height: 630, alt: `${APP_NAME}: Get the trip out of the group chat.` }],
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [image] },
  };
}

/**
 * "/" is the v5 landing page. Someone signed in (a real session, not a demo one) goes
 * straight to their most recently active trip. Logged-out visitors cost no database work:
 * the cookie check is the only thing that runs before the static markup.
 */
export default async function LandingPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    const destination = await landingDestination(token);
    if (destination) redirect(destination);
  }
  return (
    <div className="ftl">
      <header className="hero">
        <div className="photo" role="img" aria-label="Sunrise over misty mountain ridges" />
        <div className="warm" />
        <nav className="nav" aria-label="Main">
          <Link className="wm" href="/">
            {words.length ? `${words.join(" ")} ` : null}
            {words.length ? <i>{lastWord}</i> : lastWord}
          </Link>
          <div className="links">
            <a href="#how">How it works</a>
            <a href="#for">For organizers</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="right">
            <ThemeToggle className="theme" />
            <a className="pill dark" href="/new">
              Start a trip
            </a>
            <LandingMenu />
          </div>
        </nav>
        <div className="contents" dangerouslySetInnerHTML={{ __html: HERO_HTML }} />
      </header>
      <main className="lower" dangerouslySetInnerHTML={{ __html: LOWER_HTML }} />
      {/* Static: renders nothing until FEEDBACK_URL is set, and never touches the DB. */}
      <div className="flex justify-center px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <FeedbackButton />
      </div>
      <LandingEnhance />
    </div>
  );
}
