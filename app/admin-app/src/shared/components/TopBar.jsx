// src/shared/components/TopBar.jsx
import { Sun, Moon, Globe } from "lucide-react";
import useTheme from "../hooks/useTheme";
import useLanguage from "../hooks/useLanguage";

export default function TopBar({ variant = "default" }) {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLanguage } = useLanguage();

  const isDark = theme === "dark";
  const isArabic = lang === "ar";

  return (
    <div
      className={`
        flex items-center justify-between
        px-4 md:px-8 h-16
        transition-all duration-300

        ${
          variant === "auth"
            ? "absolute top-0 left-0 right-0 bg-transparent"
            : "sticky top-0 z-50 bg-surface/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
        }
      `}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Logo */}
      <h1 className="font-bold text-lg text-gray-800 dark:text-white">
        🍽 Smart Menu
      </h1>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="
            p-2 rounded-xl
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-gray-200
            hover:scale-105 transition
          "
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          aria-label="Toggle language"
          className="
            flex items-center gap-2
            px-3 py-2 rounded-xl
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-gray-200
            hover:scale-105 transition
          "
        >
          <Globe size={16} />
          <span className="text-sm font-medium">{isArabic ? "EN" : "AR"}</span>
        </button>
      </div>
    </div>
  );
}
