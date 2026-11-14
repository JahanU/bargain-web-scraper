import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { AppProviders } from "@/app/providers/AppProviders";
import { queryClient, restoreAndPersist } from "@/app/providers/queryClient";
import { dealsQueryOptions } from "@/features/deals";
import { loadDealsRequest } from "@/features/filters";
import "@/styles/index.css";

// `bun run dev:mock` serves the fixture through MSW; the import is dropped from other builds.
if (import.meta.env.MODE === "mock") {
  const { startMockWorker } = await import("@/mocks/browser");
  await startMockWorker();
}

// Show the saved snapshot at once, then start the request before React renders anything.
await restoreAndPersist();
void queryClient.prefetchQuery(dealsQueryOptions(loadDealsRequest(location.search)));

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <AppProviders client={queryClient}>
      <App />
    </AppProviders>
  </StrictMode>,
);
