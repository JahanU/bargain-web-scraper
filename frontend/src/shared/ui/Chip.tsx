import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";
import { chip } from "./chipStyles";

type ChipProps = ComponentProps<"span"> & Omit<VariantProps<typeof chip>, "interactive">;

export function Chip({ tone, size, className, ...props }: ChipProps) {
  return <span className={cn(chip({ tone, size }), className)} {...props} />;
}
