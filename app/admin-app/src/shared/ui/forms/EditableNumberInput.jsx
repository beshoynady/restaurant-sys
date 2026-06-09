export default function EditableNumberInput({
  label,
  value,
  path,
  isEditing,
  onChange,
}) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">
        {label}
      </p>

      {isEditing ? (
        <input
          type="number"
          value={value}
          onChange={(e) =>
            onChange(
              path,
              Number(e.target.value)
            )
          }
          className="w-full h-12 rounded-xl border border-border text-foreground px-4"
        />
      ) : (
        <div className="h-12 rounded-xl border border-border text-foreground px-4 flex items-center bg-surface-secondary">
          {value}
        </div>
      )}
    </div>
  );
}