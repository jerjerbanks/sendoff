import { useId } from "react";
import { APP_NAME } from "@/lib/constants";

/**
 * The product name as set in the wordmark (v6.1 "Out of the Chat"): the speech-bubble mark,
 * then Instrument Serif with the first words in ink and the last word in lake italic.
 * Mark fills come from --mark-* tokens so the dark variant swaps with the theme.
 */
export const BRAND = APP_NAME;

const BUBBLE =
  "M30,20 H66 C78.2,20 86,27.8 86,40 V52 C86,64.2 78.2,72 66,72 H42 C36,79 27,85.5 15,88 C20.5,83 23.4,78 24.6,71.2 C14.6,68.6 10,61.6 10,52 V40 C10,27.8 17.8,20 30,20 Z";
const BUBBLE_SMALL = "M28,16 H72 C84,16 92,24 92,36 V56 C92,68 84,76 72,76 H44 L20,92 L26,75 C15,72 8,65 8,56 V36 C8,24 16,16 28,16 Z";

/** The mark alone. `small` draws the simplified favicon cut, for anything under 24px. */
export function LogoMark({ small = false, className = "" }: { small?: boolean; className?: string }) {
  const clip = `ftm${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg className={`ft-mark ${className}`} viewBox="0 0 100 100" aria-hidden focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={small ? BUBBLE_SMALL : BUBBLE} />
        </clipPath>
      </defs>
      {small ? (
        <>
          <path d={BUBBLE_SMALL} className="m-bubble" />
          <g clipPath={`url(#${clip})`}>
            <circle cx="38" cy="58" r="17" className="m-sun" />
            <path d="M0,64 C30,56 60,58 100,64 V100 H0 Z" className="m-hill" />
          </g>
          <path d="M20,92 L26,74 L46,75 Z" className="m-hill" />
          <path d="M72,4 L88,34 H80 L92,58 H52 L64,34 H56 Z" className="m-pine" strokeWidth="3" strokeLinejoin="round" />
          <rect x="69" y="56" width="6" height="10" rx="2" className="m-pine" />
        </>
      ) : (
        <>
          <path d={BUBBLE} className="m-bubble" />
          <g clipPath={`url(#${clip})`}>
            <circle cx="40" cy="57" r="14" className="m-sun" />
            <path d="M0,61 C18,52 34,52 50,58 C64,63 78,58 100,54 V100 H0 Z" className="m-meadow" />
            <path d="M0,68 C26,61 52,61 100,67 V100 H0 Z" className="m-hill" />
          </g>
          <path d="M15,88 C20.5,83 23.4,78 24.6,71.2 L36,72 C32,77 25,84 15,88 Z" className="m-hill" />
          <path d="M70,9.0 C72,11.0 75.3,29.2 77.3,32.7 Q77.9,35.0 74.8,35.0 H65.2 Q62.1,35.0 62.7,32.7 C64.7,29.2 68,11.0 70,9.0 Z" className="m-pine" />
          <path d="M70,24.6 C72,26.6 78.6,46.0 80.6,49.5 Q81.2,51.8 78.1,51.8 H61.9 Q58.8,51.8 59.4,49.5 C61.4,46.0 68,26.6 70,24.6 Z" className="m-pine" />
          <path d="M70,40.2 C72,42.2 82.0,64.0 84.0,67.5 Q84.6,69.8 81.5,69.8 H58.5 Q55.4,69.8 56.0,67.5 C58.0,64.0 68,42.2 70,40.2 Z" className="m-pine" />
          <rect x="67.8" y="68" width="4.4" height="6" rx="1.5" className="m-pine" />
        </>
      )}
    </svg>
  );
}

export function Wordmark({ name = BRAND, className = "", small = false }: { name?: string; className?: string; small?: boolean }) {
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <span className={`ft-wordmark ${className}`}>
      <LogoMark small={small} />
      <span>
        {words.length ? `${words.join(" ")} ` : ""}
        {words.length ? <i>{last}</i> : last}
      </span>
    </span>
  );
}
