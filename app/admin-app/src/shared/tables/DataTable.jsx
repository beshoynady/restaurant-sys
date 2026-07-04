import React from "react";

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  renderActions,
  emptyText = "No active operational records found.",
  rowKey = "_id",
}) {
  const safeRowKey = (row) => row?.[rowKey] ?? row?.id;

  const allSelected = data.length > 0 && data.every((item) => selectedRows.includes(safeRowKey(item)));
  const totalCols = columns.length + (selectable ? 1 : 0) + (renderActions ? 1 : 0) + 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-600 border-collapse">
          
          {/* Header */}
          <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              {selectable && (
                <th className="w-12 p-4 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-4 py-3.5 text-start w-14">#</th>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3.5 text-start whitespace-nowrap font-bold text-slate-700">
                  {col.title}
                </th>
              ))}
              {renderActions && <th className="px-4 py-3.5 text-center w-36 font-bold text-slate-700">Actions</th>}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={totalCols} className="text-center py-12 text-slate-400 font-medium bg-white">
                  <div className="flex items-center justify-center gap-2">
                    <span className="animate-spin text-lg">⏳</span> Loading data stream matrix...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="text-center py-12 text-slate-400 font-medium bg-white">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const isSelected = selectedRows.includes(safeRowKey(row));
                return (
                  <tr 
                    key={safeRowKey(row)} 
                    className={`transition-all hover:bg-slate-50/60 ${isSelected ? "bg-indigo-50/20" : ""}`}
                  >
                    {selectable && (
                      <td className="text-center p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(safeRowKey(row))}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 accent-indigo-600 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-4 text-start font-mono text-xs text-slate-400">{(i + 1).toString().padStart(2, "0")}</td>
                    
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {col.render ? col.render(row) : (row[col.key] ?? "--")}
                      </td>
                    ))}

                    {renderActions && (
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          {renderActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}