import { useSyncExternalStore } from "react";

// The inline script in index.html applies the same rule before first paint:
// a stored choice wins, otherwise the system preference.
export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage blocked: follow the system
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  for (const listener of listeners) listener();
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** A manual choice; it overrides the system preference from now on. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage blocked: the choice lasts for this page view only
  }
  apply(theme);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (event: MediaQueryListEvent) => {
    if (!storedTheme()) apply(event.matches ? "dark" : "light");
  };
  system.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    system.removeEventListener("change", onSystemChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme);
}
