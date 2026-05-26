// features/auth/components/PasswordInput.jsx

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const PasswordInput = ({ register, error }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label className="block text-sm mb-2 text-gray-300">
        Password
      </label>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          {...register("password")}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-2">
          {error.message}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;