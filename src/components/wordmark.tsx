import { APP_NAME } from "@/lib/constants";

/** The product name as set in the wordmark: Instrument Serif, first word in ink, last word in lake italic (v6.1). */
export const BRAND = APP_NAME;

export function Wordmark({ name = BRAND, className = "" }: { name?: string; className?: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <span className={`ft-wordmark ${className}`}>
      {words.length ? `${words.join(" ")} ` : ""}
      {words.length ? <i>{last}</i> : last}
    </span>
  );
}
