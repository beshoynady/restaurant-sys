// src/shared/ui/ThemeToggle.jsx

// src/shared/ui/ThemeToggle.jsx

import { Sun, Moon } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import useTheme from "../../../shared/hooks/useTheme";

/**
 * Theme toggle button.
 *
 * Supports:
 * - Light / Dark mode
 * - i18n
 * - RTL / LTR
 * - Theme tokens
 */

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  const { t } = useTranslation("common");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("theme.lightMode") : t("theme.darkMode")}
      title={isDark ? t("theme.lightMode") : t("theme.darkMode")}
      className="
        flex h-10 w-10
        items-center justify-center

        rounded-xl

        border border-border
        bg-surface
        text-foreground

        transition

        hover:bg-surface-secondary
      "
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
