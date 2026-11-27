import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { LandingEnhance, LandingMenu } from "@/components/landing-client";
import { FeedbackButton } from "@/components/feedback-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/wordmark";
import { versionLine } from "@/lib/build-info";
import { APP_NAME, SESSION_COOKIE } from "@/lib/constants";
import { getViewer } from "@/lib/session";
import { requestOrigin } from "@/lib/origin";
import { LOWER } from "./landing-content";
import { ThemeIcon } from "@/components/theme-icon";
import { sceneUrl, themeTileScene } from "@/lib/scenes";
import { THEME_INFO, TRIP_THEMES } from "@/lib/trip-theme";
import "./landing.css";
import "./landing-extra.css";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const words = APP_NAME.trim().split(/\s+/);
const lastWord = words.pop() ?? "";
const WORDMARK_HTML = words.length ? `${escapeHtml(words.join(" "))} <i>${escapeHtml(lastWord)}</i>` : escapeHtml(lastWord);

// Filled once per isolate, not per request: the landing page is two static strings.
const fill = (markup: string) => markup.replaceAll("%%WM%%", WORDMARK_HTML).replaceAll("%%APP%%", escapeHtml(APP_NAME)).replaceAll("%%VERSION%%", escapeHtml(versionLine()));
const LOWER_HTML = fill(LOWER);

const TITLE = `${APP_NAME} — Get the trip out of the group chat`;
const DESCRIPTION = `One headcount, fair costs for every bed, and private budgets. ${APP_NAME} turns a group chat idea into a booked trip.`;

export async function generateMetadata(): Promise<Metadata> {
  // Absolute, per-request origin: a relative og:image resolves against localhost at build time.
  const origin = await requestOrigin();
  const image = `${origin}/og-image.png`;
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
 * "/" is the v5 landing page, for everyone. Someone signed in (a real session, not a demo
 * one) gets "Your trips" in place of "Start a trip"; it used to redirect them into their
 * latest trip, which hid the landing page. Logged-out visitors cost no database work: the
 * session lookup runs only when the cookie is present.
 */
export default async function LandingPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const viewer = token ? await getViewer() : null;
  const signedIn = !!viewer && !viewer.demo;
  return (
    <div className="ftl">
      {/* v7 hero: the six trip-type scenes as a collage (replaces the v5 photo hero). */}
      <header className="hero collage">
        <nav className="nav" aria-label="Main">
          <Link className="wm" href="/">
            <LogoMark />
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
            {signedIn ? (
              <Link className="pill dark mine" href="/trips">
                Your trips
              </Link>
            ) : (
              <a className="pill dark" href="/new">
                Start a trip
              </a>
            )}
            <LandingMenu />
          </div>
        </nav>
        <div className="collage-copy">
          <p className="ft-lbl accent">Any trip, any crew</p>
          <h1>
            Get the trip out of <em>the group chat.</em>
          </h1>
          <p className="sub">Lake weekends, golf trips, beach weeks, bach parties, city breaks, ski trips. Vote, split fairly, lock it in together.</p>
          <ul className="ft-tiles mt-6" aria-label="Kinds of trips">
            {TRIP_THEMES.map((theme, index) => (
              <li key={theme} data-trip-theme={theme} className="ft-tile">
                {/* eslint-disable-next-line @next/next/no-img-element -- static WebP served straight from assets, no optimizer on Workers */}
                <img
                  src={sceneUrl(themeTileScene(theme))}
                  alt=""
                  width={640}
                  height={360}
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
                <span className="ft-chip ft-chip-theme">
                  <ThemeIcon theme={theme} size={16} />
                  <span className="truncate">{THEME_INFO[theme].vibeLabel}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="collage-ctas">
            <Link className="ft-btn justify-center" href="/new">
              Start a trip
            </Link>
            <a className="ft-btn-sec ft-btn-sec-full" href="#how">
              See how it works
            </a>
          </div>
          <p className="note">Free for invitees · No app to download</p>
        </div>
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
