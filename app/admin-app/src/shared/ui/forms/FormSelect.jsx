export function FormSelect({
  label,
  value,
  onChange,
  options = [],
  lang = "en",
  error,
}) {
  const isArabic = lang === "ar";

  return (
    <div className="space-y-1 w-full">

      <label className="text-sm font-medium">
        {label}
      </label>

      <select
        value={value || ""}
        onChange={onChange}
        dir={isArabic ? "rtl" : "ltr"}
        className={`
          w-full px-3 py-2 rounded-lg border
          bg-white dark:bg-gray-900
          ${error ? "border-red-500" : "border-gray-300"}
        `}
      >
        <option value="">
          {isArabic ? "اختر..." : "Select..."}
        </option>

        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

    </div>
  );
}