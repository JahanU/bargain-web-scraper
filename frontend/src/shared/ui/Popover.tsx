import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ReactElement, ReactNode } from "react";

type PopoverProps = {
  /** The element that opens the popover, usually a Button. */
  trigger: ReactElement;
  /** Accessible name of the popup. */
  title: string;
  children: ReactNode;
};

export function Popover({ trigger, title, children }: PopoverProps) {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner sideOffset={6} align="start">
          <BasePopover.Popup
            aria-label={title}
            className="max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-md border border-border bg-surface-raised p-3 text-text shadow-sm transition-[opacity,scale] duration-fast ease-out data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0"
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
