/**
 * Logo URL editor with preview.
 */
export default function EditableImageInput({
  label,
  value,
  path,
  isEditing,
  onChange,
}) {
  return (
    <div className="md:col-span-2">
      <p className="text-sm text-slate-500 mb-2">{label}</p>

      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={value ?? ""}
            placeholder="https://..."
            onChange={(e) => onChange(path, e.target.value)}
            className="w-full h-12 rounded-xl border border-border text-foreground px-4 bg-surface outline-none focus:ring-2 focus:ring-blue-500"
          />

          {value && (
            <img
              src={value}
              alt="Brand Logo"
              className="w-24 h-24 rounded-2xl object-cover border border-border text-foreground"
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-12 rounded-xl border border-border text-foreground px-4 flex items-center bg-surface-secondary truncate">
            {value || "-"}
          </div>

          {value && (
            <img
              src={value}
              alt="Brand Logo"
              className="w-24 h-24 rounded-2xl object-cover border border-border text-foreground"
            />
          )}
        </div>
      )}
    </div>
  );
}
