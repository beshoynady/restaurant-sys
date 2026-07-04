// src/shared/ui/forms/EditableBadgeGroup.jsx
export default function EditableBadgeGroup({
  label,
  values,
  options,
  isEditing,
  onToggle,
}) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const selected =
            values.includes(item);

          return (
            <button
              key={item}
              type="button"
              disabled={!isEditing}
              onClick={() =>
                onToggle(item)
              }
              className={`px-3 py-2 rounded-xl text-sm ${
                selected
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}