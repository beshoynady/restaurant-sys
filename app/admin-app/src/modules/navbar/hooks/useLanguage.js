import { useEffect, useState } from "react";
import i18n from "../../../shared/locales/i18n";

const useLanguage = () => {
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

  const toggleLang = () => {
    changeLanguage(lang === "ar" ? "en" : "ar");
  };

  useEffect(() => {
    document.documentElement.dir =
      lang === "ar" ? "rtl" : "ltr";

    i18n.changeLanguage(lang);
  }, []);

  return { lang, toggleLang, changeLanguage };
};

export default useLanguage;