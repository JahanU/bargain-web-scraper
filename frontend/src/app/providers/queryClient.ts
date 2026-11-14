import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  defaultShouldDehydrateQuery,
  type InfiniteData,
  type Query,
  QueryClient,
} from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { isUnfilteredQuery } from "@/features/deals";

export const queryClient = new QueryClient();

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined; // storage blocked: no persistence, everything else works
  }
}

/**
 * The last snapshot is saved for a day, so a returning visitor sees deals while Render wakes.
 * Only what a visit opens on is kept: unfiltered views, and their first page.
 */
export const persistOptions = {
  persister: createSyncStoragePersister({ storage: browserStorage(), key: "bargain-deals" }),
  maxAge: 24 * 60 * 60_000,
  // Bump when the cached shape changes, so old snapshots are discarded.
  buster: "3",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      defaultShouldDehydrateQuery(query) && isUnfilteredQuery(String(query.queryKey[2])),
    serializeData: ({ pages, pageParams }: InfiniteData<unknown>) => ({
      pages: pages.slice(0, 1),
      pageParams: pageParams.slice(0, 1),
    }),
  },
};

/**
 * Restores the saved snapshot, then saves every later change. Runs before the first request, so
 * no response can land before saving starts (localStorage is synchronous, so this is quick).
 */
export async function restoreAndPersist(): Promise<void> {
  const [, restored] = persistQueryClient({ queryClient, ...persistOptions });
  await restored;
}
