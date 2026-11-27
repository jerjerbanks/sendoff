import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * v6.1 buttons. Primary is a lake-blue pill with an inner highlight, a 1px ring and a soft
 * shadow (hover deepens to --accent-hover); `joy` is the sun-gold celebration-only variant.
 * v6.5: `secondary` is transparent with a clay-ink label and 1.5px border and a clay tint on hover,
 * at the primary's height, radius and lake focus ring.
 * Everything presses to .97 on the micro spring. 52px tall pills.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-sans transition-[transform,background-color,color] duration-[var(--dur-micro)] ease-[var(--spring-micro)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "ft-btn justify-center",
        joy: "ft-btn joy justify-center",
        secondary: "ft-btn-sec ft-btn-sec-full",
        outline: "ft-btn2",
        ghost: "min-h-12 px-3 text-[15px] font-medium text-ink-2 hover:bg-chip",
        destructive:
          "min-h-12 border border-bad/40 bg-card px-4 text-[15px] font-semibold text-bad shadow-[var(--shadow-1)] hover:bg-bad-soft",
      },
      size: {
        default: "",
        sm: "min-h-12 px-3 text-[14px]",
        lg: "",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
