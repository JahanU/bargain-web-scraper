// Imported directly (not via the shared/ui index) so the dialog code stays in this lazy chunk.
import { Dialog } from "@/shared/ui/Dialog";

const REPO_URL = "https://github.com/JahanU/bargain-web-scraper";

type AboutDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** What the site is and where the numbers come from. Lazy-loaded. */
export default function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="About Bargain">
      <div className="space-y-3 text-sm text-text-muted">
        <p>
          Bargain lists JD Sports UK sale items that are 30% off or more. It checks the sale every 5
          minutes, and sold-out items drop off at the next check.
        </p>
        <p>
          Prices and stock can change on JD’s site between checks, so confirm there before you buy.
        </p>
        <p>Not affiliated with JD Sports.</p>
        <p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener"
            className="font-medium text-text underline underline-offset-2"
          >
            Source code on GitHub
          </a>
        </p>
      </div>
    </Dialog>
  );
}
