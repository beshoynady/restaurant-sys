import useLanguage from "../../hooks/useLanguage";

const LanguageToggle = () => {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="btn btn-outline-info btn-sm"
    >
      🌐 {lang === "ar" ? "EN" : "عربي"}
    </button>
  );
};

export default LanguageToggle;