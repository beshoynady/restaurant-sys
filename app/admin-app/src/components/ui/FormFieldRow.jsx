export function FormFieldRow({
  label,
  value,
  onChange,
  placeholder,
  error,
  lang = "en",
  type = "text",
  required = false,
}) {
  const isArabic = lang === "ar";

  return (
    <div
      className={`
        flex items-center gap-4
        w-full
      `}
    >

      {/* LABEL */}
      <label
        className={`
          w-1/3 text-sm font-medium text-gray-700 dark:text-gray-200
          ${isArabic ? "text-right" : "text-left"}
        `}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      {/* INPUT */}
      <div className="w-2/3">
        <input
          type={type}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          dir={isArabic ? "rtl" : "ltr"}
          className={`
            w-full px-3 py-2
            rounded-lg border
            bg-white dark:bg-gray-900
            text-gray-800 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500

            ${error ? "border-red-500" : "border-gray-300 dark:border-gray-700"}
          `}
        />

        {error && (
          <p className="text-sm text-red-500 mt-1">
            {isArabic ? "هذا الحقل مطلوب" : "Required field"}
          </p>
        )}
      </div>
    </div>
  );
}