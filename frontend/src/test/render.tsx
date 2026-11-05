import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

/** Renders with a fresh query cache; retries happen without waiting. */
export function renderWithClient(ui: ReactElement, client = createTestQueryClient()) {
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
}
