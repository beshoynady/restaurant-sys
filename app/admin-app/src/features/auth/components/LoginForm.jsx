// features/auth/components/LoginForm.jsx

import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";

import { loginSchema } from "../validation/loginSchema";
import { useLogin } from "../hooks/useLogin";

import PasswordInput from "./PasswordInput";
import RememberMe from "./RememberMe";

const LoginForm = () => {
  const { login, loading } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: joiResolver(loginSchema),
  });

  return (
    <form
      onSubmit={handleSubmit(login)}
      className="space-y-6"
    >
      {/* Username or Email */}
      <div>
        <label className="block text-sm mb-2 text-gray-300">
          Username or Email
        </label>

        <input
          type="text"
          placeholder="Enter username or email"
          {...register("identifier")}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-500"
        />

        {errors.identifier && (
          <p className="text-red-400 text-sm mt-2">
            {errors.identifier.message}
          </p>
        )}
      </div>

      {/* Password */}
      <PasswordInput
        register={register}
        error={errors.password}
      />

      {/* Remember me */}
      <RememberMe />

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;