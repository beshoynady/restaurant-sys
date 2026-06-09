// features/auth/pages/LoginPage.jsx

import TopBar from "../../../shared/components/TopBar";
import LoginHeader from "../components/LoginHeader";
import LoginForm from "../components/LoginForm";
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* TopBar */}
      <TopBar variant="auth" />

      {/* Center */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="grid lg:grid-cols-2 bg-surface/5 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden max-w-6xl w-full shadow-2xl">
          {/* Left Side */}
          <div className="hidden lg:flex flex-col justify-center p-16 bg-gradient-to-br from-blue-700 to-cyan-600 text-white">
            <h2 className="text-5xl font-bold leading-tight mb-6">
              {t("login.heroTitle")}
            </h2>

            <p className="text-lg text-white/90 leading-relaxed">
              {t("login.heroDescription")}
            </p>
          </div>

          {/* Right Side */}
          <div className="p-8 lg:p-14 flex items-center">
            <div className="w-full max-w-md mx-auto space-y-6">
              <LoginHeader />
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
