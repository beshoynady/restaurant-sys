import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar/translation.json";
import en from "./en/translation.json";

// 🌍 Current language
const savedLang = localStorage.getItem("lang") || "ar";

// 🚀 Initialize i18n
i18n.use(initReactI18next).init({
  resources: {
    ar: {
      translation: ar,
    },

    en: {
      translation: en,
    },
  },

  lng: savedLang,

  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },
});

// 🌍 RTL / LTR
document.documentElement.dir =
  savedLang === "ar" ? "rtl" : "ltr";

// 🌍 HTML lang attribute
document.documentElement.lang = savedLang;

export default i18n;