import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

/** A placeholder block. Decorative: announce loading through a live region instead. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-xs bg-surface-sunken motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
