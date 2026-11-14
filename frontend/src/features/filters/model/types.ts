import type { SingleParserBuilder } from "nuqs";

export type FilterChip<T> = { label: string; next: T };

/** One filter: everything the app needs except its control. The backend does the filtering. */
export type FilterDefinition<T> = {
  /** URL parsing and serialising; its default is omitted from the URL. */
  parser: SingleParserBuilder<T> & { readonly defaultValue: T };
  isActive: (value: T) => boolean;
  /** One removable chip per active part of the value, with the value after removing it. */
  chips: (value: T) => FilterChip<T>[];
};

export function defineFilter<T>(definition: FilterDefinition<T>): FilterDefinition<T> {
  return definition;
}
