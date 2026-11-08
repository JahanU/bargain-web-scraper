import { clockTime } from "@/shared/lib/format";
import { useDealsQuery } from "../hooks/useDealsQuery";
import type { Gender } from "../model/Deal";

/** "Last updated 14:05 · " for the footer; nothing until deals have loaded. */
export function LastUpdated({ gender }: { gender: Gender }) {
  const { dataUpdatedAt, data } = useDealsQuery(gender);
  if (!data) return null;
  return (
    <>
      Last updated{" "}
      <time dateTime={new Date(dataUpdatedAt).toISOString()}>{clockTime(dataUpdatedAt)}</time>
      {" · "}
    </>
  );
}
