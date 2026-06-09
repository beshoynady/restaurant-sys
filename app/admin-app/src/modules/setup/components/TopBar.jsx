import { Sun, Moon, Globe } from "lucide-react";

import useTheme from "../../../shared/hooks/useTheme";
import useLanguage from "../../../shared/hooks/useLanguage";

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();

  const { lang, toggleLanguage } = useLanguage();

  const isDark = theme === "dark";

  return (
    <div
      className="
      sticky top-0 z-50
      flex items-center justify-between
      px-4 md:px-8
      h-16
      bg-surface/80 dark:bg-gray-900/80
      backdrop-blur-md
      border-b border-gray-200 dark:border-gray-800
      transition-all duration-300
    "
    >
      <h1 className="font-bold text-lg text-gray-800 dark:text-white">
        🍽 Smart Menu
      </h1>

      <div className="flex items-center gap-2">
        {/* Theme */}
        <button
          onClick={toggleTheme}
          className="
          p-2 rounded-xl
          bg-gray-100 dark:bg-gray-800
          text-gray-700 dark:text-gray-200
          hover:scale-105
          transition
        "
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Language */}
        <button
          onClick={toggleLanguage}
          className="
          flex items-center gap-2
          px-3 py-2
          rounded-xl
          bg-gray-100 dark:bg-gray-800
          text-gray-700 dark:text-gray-200
          hover:scale-105
          transition
        "
        >
          <Globe size={16} />
          {lang.toUpperCase()}
        </button>
      </div>
    </div>
  );
}