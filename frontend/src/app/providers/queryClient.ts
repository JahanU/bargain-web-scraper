import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";

export const queryClient = new QueryClient();

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined; // storage blocked: no persistence, everything else works
  }
}

/** The last snapshot is saved for a day, so a returning visitor sees deals while Render wakes. */
export const persistOptions: PersistQueryClientProviderProps["persistOptions"] = {
  persister: createSyncStoragePersister({ storage: browserStorage(), key: "bargain-deals" }),
  maxAge: 24 * 60 * 60_000,
  // Bump when the cached deal shape changes, so old snapshots are discarded.
  buster: "1",
};
