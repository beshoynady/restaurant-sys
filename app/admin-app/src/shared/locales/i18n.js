// Src/locales/i18n.js

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar/translation.json";
import en from "./en/translation.json";

// 🌍 Get saved language
const savedLang = localStorage.getItem("lang") || "ar";

// 🚀 Init i18n
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


// 🌍 Apply direction + language to document
const applyLanguageSettings = (lng) => {
  const isArabic = lng === "ar";

  document.documentElement.lang = lng;
  document.documentElement.dir = isArabic ? "rtl" : "ltr";

  localStorage.setItem("lang", lng);
};


// 🚀 Initial apply (important on first load)
applyLanguageSettings(savedLang);


// 🔥 Listen for language changes globally
i18n.on("languageChanged", (lng) => {
  applyLanguageSettings(lng);
});


export default i18n;