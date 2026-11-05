import type { QueryClient } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { persistOptions } from "./queryClient";

export function AppProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      // The deals are prefetched before render, so they can land before the persister starts
      // listening. Save once restoring finishes so that first result is kept too.
      onSuccess={() => persistQueryClientSave({ queryClient: client, ...persistOptions })}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
