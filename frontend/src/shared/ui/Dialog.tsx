import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

/** A modal dialog: focus trap, Escape and outside click close it, focus returns to the opener. */
export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 bg-text/30 transition-opacity duration-base data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup className="fixed top-1/2 left-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-1/2 rounded-md border border-border bg-surface-raised p-5 text-text shadow-sm transition-[opacity,scale] duration-base ease-out data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0">
          <div className="mb-3 flex items-center justify-between gap-4">
            <BaseDialog.Title className="text-base font-bold">{title}</BaseDialog.Title>
            <BaseDialog.Close
              render={<IconButton label="Close" icon={<X size={16} aria-hidden />} size="sm" />}
            />
          </div>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
