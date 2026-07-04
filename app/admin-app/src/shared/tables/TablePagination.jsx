import React from "react";

export default function TablePagination({
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
        Showing{" "}
        <span className="text-slate-700">{(page - 1) * pageSize + 1}</span> -{" "}
        <span className="text-slate-700">
          {Math.min(page * pageSize, total)}
        </span>{" "}
        of <span className="text-slate-700">{total}</span> Rows
      </div>

      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="h-9 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl px-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size} Rows
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          <button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
          >
            ‹
          </button>

          {[...Array(totalPages)].map((_, idx) => {
            const p = idx + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition ${
                  p === page
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
