import useLanguage from "../hooks/useLanguage";

const LanguageToggle = () => {
  const { lang, toggleLang } = useLanguage();

  return (
    <div
      className="nav-item d-flex align-items-center justify-content-center mx-1"
      style={{ cursor: "pointer" }}
      onClick={toggleLang}
    >
      <button className="btn btn-outline-info btn-sm d-flex align-items-center">
        🌐 {lang === "ar" ? "EN" : "عربي"}
      </button>
    </div>
  );
};

export default LanguageToggle;