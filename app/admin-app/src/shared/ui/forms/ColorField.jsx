// src/shared/ui/forms/ColorField.jsx

export default function ColorField({ label, value, lang, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-muted-foreground">{label}</label>

      <input
        type="color"
        value={value || "#000000"}
        onChange={onChange}
        className="w-full h-10 rounded-xl border border-border"
      />
    </div>
  );
}
