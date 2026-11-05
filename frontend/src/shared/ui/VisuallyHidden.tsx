import type { ComponentProps } from "react";

/** Read by assistive tech, invisible on screen. */
export function VisuallyHidden(props: ComponentProps<"span">) {
  return <span className="sr-only" {...props} />;
}
