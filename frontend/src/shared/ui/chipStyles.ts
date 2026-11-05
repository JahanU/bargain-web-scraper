import { cva } from "class-variance-authority";

// Every colour is a token, so dark mode needs no extra classes.
export const chip = cva(
  "inline-flex items-center gap-1 rounded-xs border text-xs font-medium transition-colors duration-fast",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-sunken text-text",
        selected: "border-accent bg-accent text-accent-fg",
        muted: "border-transparent bg-surface-sunken text-text-muted",
      },
      interactive: { true: "cursor-pointer hover:border-border-strong", false: "" },
      size: { xs: "h-5 px-1.5", sm: "h-8 px-2.5", md: "h-10 px-3 text-sm" },
    },
    defaultVariants: { tone: "neutral", interactive: false, size: "sm" },
  },
);
