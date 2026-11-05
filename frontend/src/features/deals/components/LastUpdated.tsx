import { clockTime } from "@/shared/lib/format";
import { useDealsQuery } from "../hooks/useDealsQuery";

/** "Last updated 14:05 · " for the footer; nothing until deals have loaded. */
export function LastUpdated() {
  const { dataUpdatedAt, data } = useDealsQuery();
  if (!data) return null;
  return (
    <>
      Last updated{" "}
      <time dateTime={new Date(dataUpdatedAt).toISOString()}>{clockTime(dataUpdatedAt)}</time>
      {" · "}
    </>
  );
}
