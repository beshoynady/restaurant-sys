// src/shared/ui/data-table/TableFilters.jsx
import React from "react";

export default function TableFilters({
  children,
  onReset,
  showReset = true,

  title = "Filters",
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">{title}</h3>

        {showReset && (
          <button
            onClick={onReset}
            className="
              px-3 py-1.5
              text-sm
              rounded-md
              bg-gray-100 hover:bg-gray-200
              border
            "
          >
            Reset
          </button>
        )}
      </div>

      {/* FILTERS BODY */}
      <div className="flex flex-wrap gap-3 items-end">{children}</div>
    </div>
  );
}
