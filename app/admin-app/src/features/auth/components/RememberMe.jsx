// features/auth/components/RememberMe.jsx

import { useTranslation } from "react-i18next";

const RememberMe = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between text-sm text-gray-300">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" />
        {t("login.rememberMe")}
      </label>

      <button type="button" className="text-blue-400 hover:text-blue-300">
        {t("login.forgotPassword")}
      </button>
    </div>
  );
};

export default RememberMe;
