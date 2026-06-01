// src/shared/ui/LanguageSwitcher.jsx
import { Globe } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(
      i18n.language === "en"
        ? "ar"
        : "en",
    );
  };

  return (
    <button
      onClick={toggleLanguage}
      className="
        flex h-10 w-10
        items-center justify-center
        rounded-full

        bg-gray-200
        dark:bg-gray-700

        text-gray-800
        dark:text-gray-200

        transition-colors duration-300
      "
      title={
        i18n.language === "en"
          ? t("language.switchToArabic")
          : t("language.switchToEnglish")
      }
    >
      <Globe size={20} />
    </button>
  );
}