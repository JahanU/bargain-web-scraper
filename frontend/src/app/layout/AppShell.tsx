import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only rounded-sm bg-accent px-3 py-2 text-sm font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to deals
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
