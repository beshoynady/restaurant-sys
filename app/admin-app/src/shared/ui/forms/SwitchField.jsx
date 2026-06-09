// src/shared/ui/forms/SwitchField.jsx
export default function SwitchField({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 accent-primary"
      />
    </div>
  );
}
