import { clockTime, relativeTime } from "@/shared/lib/format";

type ResultsSummaryProps = {
  /** Deals the request matches, loaded or not. */
  total: number;
  /** Left out while the list on screen is the previous request's. */
  updatedAt: number | undefined;
};

export function ResultsSummary({ total, updatedAt }: ResultsSummaryProps) {
  return (
    <p className="mb-3 text-xs text-text-muted">
      {/* Only the count is announced; the time ticking over would be noise. */}
      <span aria-live="polite">
        {total} {total === 1 ? "deal" : "deals"}
      </span>
      {updatedAt !== undefined && (
        <>
          {" · updated "}
          <time dateTime={new Date(updatedAt).toISOString()} title={clockTime(updatedAt)}>
            {relativeTime(updatedAt)}
          </time>
        </>
      )}
    </p>
  );
}
