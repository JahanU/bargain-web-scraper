import { Button } from "@/shared/ui";
import { ApiError } from "../api/ApiError";

const WAKING = {
  title: "The deals server is still waking up",
  body: "It sleeps when nobody has visited for a while, and waking can take a minute. Try again shortly.",
};

function copyFor(error: unknown): { title: string; body: string } {
  if (!(error instanceof ApiError)) return WAKING;
  switch (error.kind) {
    case "network":
    case "still-loading":
      return WAKING;
    case "timeout":
      return { title: "The deals server took too long to answer", body: "Try again in a moment." };
    case "http":
      return {
        title: "The deals server had a problem",
        body: `It answered with error ${error.status}. Try again in a moment.`,
      };
    case "invalid-body":
      return {
        title: "The deals server sent something unexpected",
        body: "Try again in a moment.",
      };
  }
}

type ErrorStateProps = { error: unknown; onRetry: () => void; retrying: boolean };

/** First load failed and there is no saved snapshot to show. */
export function ErrorState({ error, onRetry, retrying }: ErrorStateProps) {
  const { title, body } = copyFor(error);
  return (
    <section
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center"
    >
      <svg viewBox="0 0 20 32" className="h-10 w-auto text-accent" aria-hidden>
        <path fill="currentColor" d="M10 0 20 16 10 32 0 16Z" />
      </svg>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-text-muted">{body}</p>
      <Button tone="primary" onClick={onRetry} disabled={retrying}>
        {retrying ? "Trying again…" : "Try again"}
      </Button>
    </section>
  );
}
