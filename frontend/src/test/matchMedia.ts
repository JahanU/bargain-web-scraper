// jsdom has no matchMedia. This stub answers prefers-color-scheme and can flip it mid-test.
type Listener = (event: MediaQueryListEvent) => void;

let systemDark = false;
const listeners = new Set<Listener>();

export function setSystemDark(dark: boolean) {
  systemDark = dark;
  for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent);
}

export function installMatchMedia() {
  systemDark = false;
  listeners.clear();
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return query.includes("dark") && systemDark;
      },
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    }) as unknown as MediaQueryList;
}
