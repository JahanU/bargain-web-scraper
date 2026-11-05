import { Chip, VisuallyHidden } from "@/shared/ui";

const MAX = 5;
const MAX_NARROW = 3; // below 400 px

/** The first few sizes and "+N" for the rest; fewer on very narrow screens. */
export function SizeChips({ sizes }: { sizes: readonly string[] }) {
  if (sizes.length === 0) return null;
  const shown = sizes.slice(0, MAX);
  return (
    <div>
      <VisuallyHidden>Sizes </VisuallyHidden>
      <ul className="flex flex-wrap items-center gap-1">
        {shown.map((size, index) => (
          <li key={size} className={index >= MAX_NARROW ? "max-[399px]:hidden" : undefined}>
            <Chip size="xs" tone="muted">
              {size}
            </Chip>
          </li>
        ))}
        {sizes.length > MAX_NARROW && (
          <li className="text-[11px] text-text-muted">
            {/* Screen readers get the wide-screen count only, so it isn't read twice. */}
            <span className="min-[400px]:hidden" aria-hidden>
              +{sizes.length - MAX_NARROW}
            </span>
            {sizes.length > MAX && (
              <span className="max-[399px]:hidden">+{sizes.length - MAX}</span>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
