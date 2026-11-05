import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Button, type ButtonProps } from "./Button";

type IconButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  /** Accessible name; an icon alone has none. */
  label: string;
  icon: ReactNode;
};

export function IconButton({ label, icon, className, tone = "ghost", ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      tone={tone}
      className={cn("aspect-square px-0", className)}
      {...props}
    >
      {icon}
    </Button>
  );
}
