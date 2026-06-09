// features/auth/components/LoginForm.jsx

import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { useTranslation } from "react-i18next";

import { loginSchema } from "../validation/loginSchema";
import { useLogin } from "../hooks/useLogin";

import PasswordInput from "./PasswordInput";
import RememberMe from "./RememberMe";

const LoginForm = () => {
  const { login, loading } = useLogin();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: joiResolver(loginSchema),
  });

  const identifierLabel = `${t("login.username")} / ${t("login.email")}`;

  return (
    <form onSubmit={handleSubmit(login)} className="space-y-6">
      {/* Identifier */}
      <div>
        <label className="block text-sm mb-2 text-gray-300">
          {identifierLabel}
        </label>

        <input
          type="text"
          placeholder={t("login.placeholders.username")}
          {...register("identifier")}
          className="
            w-full px-4 py-3 rounded-xl
            bg-surface/10 border border-white/10
            text-white outline-none
            focus:border-blue-500
          "
        />

        {errors.identifier && (
          <p className="text-red-400 text-sm mt-2">
            {errors.identifier.message}
          </p>
        )}
      </div>

      {/* Password */}
      <PasswordInput register={register} error={errors.password} />

      {/* Remember Me */}
      <RememberMe />

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3 rounded-xl
          bg-blue-600 hover:bg-blue-700
          transition-all text-white font-semibold
        "
      >
        {loading ? t("login.loading") : t("login.loginButton")}
      </button>
    </form>
  );
};

export default LoginForm;
