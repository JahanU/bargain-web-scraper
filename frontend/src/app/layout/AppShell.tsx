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
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
