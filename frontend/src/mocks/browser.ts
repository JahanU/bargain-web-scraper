import { setupWorker } from "msw/browser";
import { handlers, scenarios } from "./handlers";

export async function startMockWorker() {
  const worker = setupWorker(...handlers);
  const scenario = new URLSearchParams(location.search).get("mock");
  if (scenario && scenario in scenarios) worker.use(scenarios[scenario as keyof typeof scenarios]);
  await worker.start({ onUnhandledFrame: "bypass" });
}
