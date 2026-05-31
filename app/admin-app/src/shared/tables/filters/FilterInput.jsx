// src/shared/table/filters/FilterSelect.jsx

const FilterSelect = ({ label, value, onChange, options = [] }) => {
  return (
    <div className="flex flex-col gap-1 min-w-[220px]">
      <label className="text-sm font-medium">{label}</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterSelect;
