import { ExternalLink } from "lucide-react";
import { AboutButton } from "@/features/about";
import { ThemeToggle } from "@/features/theme";
import { Brand } from "./Brand";

const REPO_URL = "https://github.com/JahanU/bargain-web-scraper";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface-raised">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:h-[52px] sm:px-6">
        <Brand />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AboutButton />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener"
            aria-label="GitHub (opens in a new tab)"
            className="hidden h-10 items-center gap-1 rounded-sm px-2 text-sm font-medium text-text-muted hover:text-text sm:inline-flex"
          >
            GitHub
            <ExternalLink size={16} aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}
