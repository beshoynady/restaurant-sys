import { Sun, Moon, Globe } from "lucide-react";

export default function TopBar({ theme, setTheme, lang, setLang }) {
  const isDark = theme === "dark";

  return (
    <div className="flex justify-between items-center w-100 px-8 py-4 bg-white/80 dark:bg-gray-900/80 
    backdrop-blur border-b border-gray-100 dark:border-gray-800 transition" style={{ height: "64px", zIndex: 100 }}>

      <div className={`flex gap-3 items-center text-gray-800 dark:text-white font-medium text-lg 
      transition ${lang === "ar" ? "flex-row-reverse flex" : ""}`}>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="btn-icon"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="btn-icon flex items-center gap-1"
        >
          <Globe size={16} />
          {lang.toUpperCase()}
        </button>

      </div>

    </div>
  );
}