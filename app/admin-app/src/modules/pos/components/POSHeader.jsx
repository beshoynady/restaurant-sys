import { Search, Sun, Moon, Globe } from "lucide-react";

import useTheme from "../../../shared/hooks/useTheme";
import useLanguage from "../../../shared/hooks/useLanguage";

export default function POSHeader() {
  const { theme, toggleTheme } = useTheme();

  const { lang, toggleLanguage } = useLanguage();

  const isDark = theme === "dark";

  return (
    <header
      className="
        flex items-center justify-between
        gap-4
        px-4 py-4
        border-b
        border-gray-200 dark:border-gray-800
        bg-surface dark:bg-gray-900
      "
    >
      {/* SEARCH */}
      <div className="relative w-full max-w-md">
        <Search
          size={18}
          className="
            absolute top-1/2 -translate-y-1/2
            right-3
            text-gray-400
          "
        />

        <input
          type="text"
          placeholder={lang === "ar" ? "ابحث عن منتج..." : "Search product..."}
          className="
            w-full
            rounded-2xl
            border
            border-gray-200 dark:border-gray-700
            bg-gray-100 dark:bg-gray-800
            px-10 py-3
            text-sm
            outline-none
            focus:ring-2
            focus:ring-orange-500
            dark:text-white
          "
        />
      </div>

      {/* ACTIONS */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="
            p-3 rounded-2xl
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-white
            hover:scale-105
            transition
          "
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={toggleLanguage}
          className="
            flex items-center gap-2
            px-4 py-3
            rounded-2xl
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-white
            hover:scale-105
            transition
          "
        >
          <Globe size={18} />

          {lang.toUpperCase()}
        </button>
      </div>
    </header>
  );
}