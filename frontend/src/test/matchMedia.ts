// jsdom has no matchMedia. This stub answers prefers-color-scheme and can flip it mid-test; any
// other query is the filters' "wide screen" one, which a test sets before it renders.
type Listener = (event: MediaQueryListEvent) => void;

let systemDark = false;
let wide = true;
const listeners = new Set<Listener>();

export function setSystemDark(dark: boolean) {
  systemDark = dark;
  for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent);
}

/** Narrow screens keep the filters in a sheet; wide ones (the default) in the bar and sidebar. */
export function setWide(value: boolean) {
  wide = value;
}

export function installMatchMedia() {
  systemDark = false;
  wide = true;
  listeners.clear();
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return query.includes("dark") ? systemDark : wide;
      },
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    }) as unknown as MediaQueryList;
}
