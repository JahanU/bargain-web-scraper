import { ExternalLink } from "lucide-react";
import { AboutButton } from "@/features/about";
import { ThemeToggle } from "@/features/theme";
import { Brand } from "./Brand";

const REPO_URL = "https://github.com/JahanU/bargain-web-scraper";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface-raised">
      <div className="page-container flex h-header items-center justify-between">
        <Brand />
        {/* Pulled out by the buttons' own padding, so the glyphs end on the container edge. */}
        <div className="-mr-2 flex items-center">
          <ThemeToggle />
          <AboutButton />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener"
            aria-label="GitHub (opens in a new tab)"
            className="hidden h-10 items-center gap-1 rounded-sm px-2 text-sm font-semibold transition-colors duration-fast hover:bg-surface-sunken sm:inline-flex"
          >
            GitHub
            <ExternalLink size={16} aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}
