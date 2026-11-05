import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

const badge = cva(
  "inline-flex h-6 items-center gap-1 rounded-xs px-1.5 text-[13px] leading-none font-bold uppercase font-stretch-[90%]",
  {
    variants: {
      tone: {
        accent: "bg-accent text-accent-fg",
        outline: "border border-border-strong bg-surface-raised text-text",
      },
    },
    defaultVariants: { tone: "accent" },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badge>;

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
