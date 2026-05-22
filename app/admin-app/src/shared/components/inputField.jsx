// =====================================
// 📁 ui/InputField.jsx
// =====================================
export default function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none transition"
      />
    </div>
  );
}