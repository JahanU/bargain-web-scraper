import { clockTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui";

type StaleBannerProps = { updatedAt: number; onRetry: () => void; retrying: boolean };

/** A refresh failed but a snapshot is on screen. */
export function StaleBanner({ updatedAt, onRetry, retrying }: StaleBannerProps) {
  return (
    <output className="mb-4 flex min-h-10 items-center justify-between gap-3 rounded-sm bg-warning-bg px-3 text-sm text-warning-fg">
      <p>Showing deals from {clockTime(updatedAt)}, couldn’t refresh.</p>
      <Button tone="ghost" size="sm" onClick={onRetry} disabled={retrying}>
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </output>
  );
}
