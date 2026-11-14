import { clockTime } from "@/shared/lib/format";
import { useDealsQuery } from "../hooks/useDealsQuery";
import type { DealsRequest } from "../model/Deal";

/** "Last updated 14:05 · " for the footer; nothing until this selection's deals have loaded. */
export function LastUpdated({ request }: { request: DealsRequest }) {
  const { dataUpdatedAt, data, isPlaceholderData } = useDealsQuery(request);
  if (!data || isPlaceholderData) return null;
  return (
    <>
      Last updated{" "}
      <time dateTime={new Date(dataUpdatedAt).toISOString()}>{clockTime(dataUpdatedAt)}</time>
      {" · "}
    </>
  );
}
