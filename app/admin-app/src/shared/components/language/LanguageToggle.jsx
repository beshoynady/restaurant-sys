// src/shared/components/language/LanguageToggle.jsx
import useLanguage from "../../hooks/useLanguage";

const LanguageToggle = () => {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="
        px-3 py-2 rounded-xl
        bg-surface/10 text-white
        hover:scale-105 transition
        text-sm font-medium
      "
    >
      🌐 {lang === "ar" ? "EN" : "AR"}
    </button>
  );
};

export default LanguageToggle;
