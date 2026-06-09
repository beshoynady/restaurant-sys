// features/auth/components/PasswordInput.jsx

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const PasswordInput = ({ register, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  return (
    <div>
      <label className="block text-sm mb-2 text-gray-300">
        {t("login.password")}
      </label>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("login.placeholders.password")}
          {...register("password")}
          className="
            w-full px-4 py-3 rounded-xl
            bg-surface/10 border border-white/10
            text-white outline-none
            focus:border-blue-500
          "
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="
          absolute top-1/2 -translate-y-1/2
          end-4 text-gray-400 hover:text-gray-200"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mt-2">{error.message}</p>}
    </div>
  );
};

export default PasswordInput;
