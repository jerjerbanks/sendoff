import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "flex h-12 w-full rounded-2xl border border-line bg-paper px-3 text-base text-ink outline-none placeholder:text-muted focus-visible:border-accent";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
