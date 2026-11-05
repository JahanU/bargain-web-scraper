import { clockTime, relativeTime } from "@/shared/lib/format";

type ResultsSummaryProps = { shown: number; total: number; updatedAt: number };

const deals = (count: number) => `${count} ${count === 1 ? "deal" : "deals"}`;

export function ResultsSummary({ shown, total, updatedAt }: ResultsSummaryProps) {
  return (
    <p className="mb-3 text-xs text-text-muted">
      {/* Only the count is announced; the time ticking over would be noise. */}
      <span aria-live="polite">
        {shown === total ? deals(total) : `${shown} of ${deals(total)}`}
      </span>
      {" · updated "}
      <time dateTime={new Date(updatedAt).toISOString()} title={clockTime(updatedAt)}>
        {relativeTime(updatedAt)}
      </time>
    </p>
  );
}
