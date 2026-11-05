import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactElement } from "react";

type Options = {
  client?: QueryClient;
  /** The page's starting query string, e.g. "?sizes=M,L". */
  searchParams?: string;
  /** Called with every URL write; assert on it instead of on internal state. */
  onUrlUpdate?: OnUrlUpdateFunction;
};

/** Renders with a fresh query cache (retries don't wait) and a test URL. */
export function renderWithClient(ui: ReactElement, options: Options = {}) {
  const client = options.client ?? createTestQueryClient();
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <NuqsTestingAdapter
          searchParams={options.searchParams}
          onUrlUpdate={options.onUrlUpdate}
          hasMemory
        >
          {ui}
        </NuqsTestingAdapter>
      </QueryClientProvider>,
    ),
  };
}

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
}
