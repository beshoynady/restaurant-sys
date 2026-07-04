// src/shared/ui/forms/EditableSelect.jsx 

export default function EditableSelect({
  label,
  value,
  path,
  options,
  isEditing,
  onChange,
}) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">
        {label}
      </p>

      {isEditing ? (
        <select
          value={value}
          onChange={(e) =>
            onChange(path, e.target.value)
          }
          className="w-full h-12 rounded-xl border border-border text-foreground px-4"
        >
          {options.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>
      ) : (
        <div className="h-12 rounded-xl border border-border text-foreground px-4 flex items-center bg-surface-secondary">
          {value}
        </div>
      )}
    </div>
  );
}