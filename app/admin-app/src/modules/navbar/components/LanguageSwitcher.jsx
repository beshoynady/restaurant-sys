// src/shared/ui/LanguageSwitcher.jsx
import { Globe } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

/**
 * Language Switcher
 * Fully integrated with:
 * - i18n system
 * - RTL/LTR support
 * - Theme system (semantic colors only)
 */

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const languages = ["en", "ar"];

  const toggleLanguage = () => {
    const nextLang = i18n.language === "en" ? "ar" : "en";

    i18n.changeLanguage(nextLang);
    localStorage.setItem("language", nextLang);
  };

  useEffect(() => {
    const lang = localStorage.getItem("language");

    if (lang) {
      i18n.changeLanguage(lang);
    }
  }, []);

  return (
    <button
      onClick={toggleLanguage}
      title={t("language.toggle")}
      className="
        h-10 w-10
        flex items-center justify-center

        rounded-full

        bg-surface
        text-foreground
        border border-border

        hover:bg-surface-secondary

        transition
      "
    >
      <Globe size={20} />
    </button>
  );
}
