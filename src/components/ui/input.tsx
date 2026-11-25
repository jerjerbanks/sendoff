import * as React from "react";
import { cn } from "@/lib/utils";

/** 52px control, 8px radius, a control-contrast border (3:1 on white). */
export const fieldClass =
  "flex h-[52px] w-full rounded-lg border border-ctl bg-card px-3.5 text-base text-ink outline-none transition-shadow duration-[var(--dur-fade)] placeholder:text-muted focus-visible:border-lake focus-visible:shadow-[var(--ring-focus)]";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
