import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Mono status chip, 4px radius. Tone always comes with words, never colour alone. */
const badgeVariants = cva("ft-chip uppercase tracking-[0.06em]", {
  variants: {
    tone: {
      default: "",
      good: "pine",
      warn: "warn",
      bad: "bad",
      accent: "on",
    },
  },
  defaultVariants: { tone: "default" },
});

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
