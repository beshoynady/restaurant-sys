// src/shared/table/filters/FilterDate.jsx

export function DateRangeFilter({ label, from, to, onChangeFrom, onChangeTo }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-600">{label}</label>}

      <div className="flex gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onChangeFrom(e.target.value)}
          className="border rounded-lg px-2 py-2 text-sm"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => onChangeTo(e.target.value)}
          className="border rounded-lg px-2 py-2 text-sm"
        />
      </div>
    </div>
  );
}
