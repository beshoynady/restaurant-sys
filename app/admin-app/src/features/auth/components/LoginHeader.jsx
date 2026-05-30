// features/auth/components/LoginHeader.jsx

import { useTranslation } from "react-i18next";

const LoginHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-bold text-white">{t("auth.welcome")}</h1>

      <p className="text-gray-300 text-sm">{t("auth.loginDescription")}</p>
    </div>
  );
};

export default LoginHeader;
