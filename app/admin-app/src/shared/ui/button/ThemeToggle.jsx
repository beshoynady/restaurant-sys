// src/shared/ui/ThemeToggle.jsx

import { Sun, Moon } from "@phosphor-icons/react";
import useTheme from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="card w-10 h-10 flex items-center justify-center"
      title={isDark ? "Light Mode" : "Dark Mode"}
    >
      {isDark ? (
        <Moon size={20} />
      ) : (
        <Sun size={20} />
      )}
    </button>
  );
}