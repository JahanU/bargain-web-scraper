import { Button } from "@/shared/ui";

export type EmptyAction = { label: string; onClick: () => void };

type EmptyStateProps = { title: string; hint?: string; actions: readonly EmptyAction[] };

/** No deals to show; the copy and the ways out come from whoever knows why. */
export function EmptyState({ title, hint, actions }: EmptyStateProps) {
  return (
    <section
      aria-labelledby="empty-title"
      className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center"
    >
      <svg viewBox="0 0 20 32" className="h-10 w-auto text-text-faint" aria-hidden>
        <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M10 1 19 16 10 31 1 16Z" />
      </svg>
      <h2 id="empty-title" className="text-lg font-bold">
        {title}
      </h2>
      {hint && <p className="text-sm text-text-muted">{hint}</p>}
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              tone={index === 0 ? "primary" : "secondary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
