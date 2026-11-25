import { APP_NAME } from "@/lib/constants";

/** The product name as set in the v4 wordmark: Instrument Serif, last word in clay italic. */
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
