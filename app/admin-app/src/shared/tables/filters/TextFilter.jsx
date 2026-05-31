// src/shared/ui/filters/FilterText.jsx
export function TextFilter({
  label,
  value,
  onChange,
  placeholder = "Search...",
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-600">{label}</label>}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}
