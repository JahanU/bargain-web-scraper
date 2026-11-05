import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { IconButton, VisuallyHidden } from "@/shared/ui";
import { SEARCH_MAX_LENGTH } from "../model/registry";

type SearchFieldProps = { value: string; onChange: (value: string) => void; className?: string };

export function SearchField({ value, onChange, className }: SearchFieldProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <label className="flex w-full items-center">
        <VisuallyHidden>Search deals</VisuallyHidden>
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 text-text-muted"
        />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={SEARCH_MAX_LENGTH}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search deals, brands…"
          className="h-11 w-full rounded-sm border border-border bg-surface-sunken pr-10 pl-9 text-base placeholder:text-text-muted hover:border-border-strong sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
        />
      </label>
      {value && (
        <IconButton
          label="Clear search"
          icon={<X size={16} aria-hidden />}
          size="sm"
          className="absolute right-1"
          onClick={() => onChange("")}
        />
      )}
    </div>
  );
}
