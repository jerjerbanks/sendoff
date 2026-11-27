import type { TripTheme } from "@/lib/trip-theme";

/** v7 theme line icons (design pack icons/theme-*.svg): 24px, 1.7 stroke, currentColor. Decorative. */
export function ThemeIcon({ theme, size = 24, className = "" }: { theme: TripTheme | "money"; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {theme === "outdoors" ? (
        <>
          <path d="M12 3 5 14h4l-3 5h12l-3-5h4z" />
          <path d="M12 19v2" />
        </>
      ) : theme === "golf" ? (
        <>
          <path d="M7 21V3l9 4-9 4" />
          <ellipse cx="11" cy="20.5" rx="7" ry="1.5" />
        </>
      ) : theme === "beach" ? (
        <>
          <path d="M3 11a9 9 0 0 1 18 0z" />
          <path d="M12 11v10M12 2v1" />
          <path d="M8 21h8" />
        </>
      ) : theme === "party" ? (
        <>
          <path d="M5 4h14l-7 8z" />
          <path d="M12 12v8M8 20h8" />
          <circle cx="16" cy="7" r="1.2" />
        </>
      ) : theme === "city" ? (
        <>
          <path d="M3 21V9l5-3v15M8 21V4h8v17M16 21V10l5 3v8" />
          <path d="M11 8h2M11 12h2M11 16h2" />
        </>
      ) : theme === "ski" ? (
        <>
          <path d="M3 5l18 6" />
          <path d="M9 7v6h6V9" />
          <path d="M4 20l16-3M7 19l2-4M13 18l2-4" />
        </>
      ) : (
        <>
          <rect x="3" y="6" width="18" height="13" rx="3" />
          <path d="M3 10h18M7 15h4" />
        </>
      )}
    </svg>
  );
}
