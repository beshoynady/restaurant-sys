// app/providers/LanguageProvider.jsx

import { createContext, useEffect, useState } from "react";
import i18n from "../../shared/locales/i18n";

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(i18n.language || "en");

  // 🔥 Sync state with i18n
  useEffect(() => {
    const handleChange = (lng) => {
      setLangState(lng);
      localStorage.setItem("lang", lng);
    };

    i18n.on("languageChanged", handleChange);

    return () => {
      i18n.off("languageChanged", handleChange);
    };
  }, []);

  // 🔥 Change language
  const setLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const toggleLanguage = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLanguage(next);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
