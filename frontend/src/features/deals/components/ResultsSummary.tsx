import { clockTime, relativeTime } from "@/shared/lib/format";

type ResultsSummaryProps = {
  shown: number;
  total: number;
  /** Left out while the list on screen is the previous selection's. */
  updatedAt: number | undefined;
};

const deals = (count: number) => `${count} ${count === 1 ? "deal" : "deals"}`;

export function ResultsSummary({ shown, total, updatedAt }: ResultsSummaryProps) {
  return (
    <p className="mb-3 text-xs text-text-muted">
      {/* Only the count is announced; the time ticking over would be noise. */}
      <span aria-live="polite">
        {shown === total ? deals(total) : `${shown} of ${deals(total)}`}
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
