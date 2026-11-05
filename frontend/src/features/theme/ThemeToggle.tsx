import { Moon } from "lucide-react";
import { IconButton } from "@/shared/ui";
import { setTheme, useTheme } from "./themeStore";

export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <IconButton
      label="Dark theme"
      aria-pressed={dark}
      icon={<Moon size={20} aria-hidden />}
      onClick={() => setTheme(dark ? "light" : "dark")}
    />
  );
}
