export default function FormField({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  lang = "en",
  required = false,
  hint,
}) {
  const isArabic = lang === "ar";

  const isInline = false; // ممكن نخليه prop بعدين لو عايز layout جانبي

  return (
    <div className="w-full space-y-1">

      {/* ================= LABEL ================= */}
      <label
        className={`text-sm font-medium text-gray-700 dark:text-gray-200 flex gap-1 ${
          isArabic ? "text-right justify-end" : "text-left"
        }`}
      >
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      {/* ================= INPUT ================= */}
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full
          px-3 py-2
          rounded-lg
          border
          bg-white dark:bg-gray-900
          text-gray-800 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition

          ${error ? "border-red-500" : "border-gray-300 dark:border-gray-700"}
        `}
        dir={isArabic ? "rtl" : "ltr"}
      />

      {/* ================= ERROR ================= */}
      {error && (
        <p className="text-sm text-red-500">
          {isArabic ? "هذا الحقل مطلوب" : "This field is required"}
        </p>
      )}

      {/* ================= HINT ================= */}
      {hint && (
        <p className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}