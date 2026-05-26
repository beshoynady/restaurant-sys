// features/auth/components/RememberMe.jsx

const RememberMe = () => {
  return (
    <div className="flex items-center justify-between text-sm text-gray-300">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" />
        Remember me
      </label>

      <button
        type="button"
        className="text-blue-400 hover:text-blue-300"
      >
        Forgot password?
      </button>
    </div>
  );
};

export default RememberMe;