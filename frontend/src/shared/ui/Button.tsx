import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border text-sm font-semibold whitespace-nowrap transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      tone: {
        primary: "border-accent bg-accent text-accent-fg hover:brightness-110",
        secondary: "border-border bg-surface-raised text-text hover:border-border-strong",
        ghost: "border-transparent text-text hover:bg-surface-sunken",
      },
      size: { sm: "h-8 px-3", md: "h-11 px-4 sm:h-10" },
    },
    defaultVariants: { tone: "secondary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof button>;

export function Button({ tone, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ tone, size }), className)} {...props} />;
}
