import { createContext, useState } from "react";
import i18n from "../../shared/locales/i18n";

export const LanguageContext = createContext();

const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(
    localStorage.getItem("lang") || "ar"
  );

  const changeLanguage = (newLang) => {
    setLang(newLang);

    i18n.changeLanguage(newLang);

    localStorage.setItem("lang", newLang);

    document.documentElement.dir =
      newLang === "ar" ? "rtl" : "ltr";
  };

  const toggleLanguage = () => {
    changeLanguage(lang === "ar" ? "en" : "ar");
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        changeLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;