import { useContext } from "react";
import { LanguageContext } from "../../app/providers/LanguageProvider";

const useLanguage = () => {
  return useContext(LanguageContext);
};

export default useLanguage;