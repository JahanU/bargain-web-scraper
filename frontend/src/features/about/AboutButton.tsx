import { Info } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { IconButton } from "@/shared/ui";

const loadDialog = () => import("./AboutDialog");
const AboutDialog = lazy(loadDialog);

export function AboutButton() {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  return (
    <>
      <IconButton
        label="About Bargain"
        icon={<Info size={20} aria-hidden />}
        onPointerDown={() => void loadDialog()}
        onClick={() => {
          setRequested(true);
          setOpen(true);
        }}
      />
      {/* Stays mounted after the first open so the dialog can animate closed and return focus. */}
      {requested && (
        <Suspense fallback={null}>
          <AboutDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
