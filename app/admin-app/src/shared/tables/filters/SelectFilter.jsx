// src/shared/ui/filters/FilterSelect.jsx

export function SelectFilter({ label, value, onChange, options = [] }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-600">{label}</label>}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
