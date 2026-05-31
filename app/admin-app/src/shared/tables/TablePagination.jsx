// src/shared/tables/TablePagination.jsx
import React from "react";

const TablePagination = ({
  total = 0,
  page = 1,
  pageSize = 10,

  onPageChange,
  onPageSizeChange,

  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const totalPages = Math.ceil(total / pageSize);

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;

  const endItem = Math.min(page * pageSize, total);

  const getPages = () => {
    const pages = [];

    let start = Math.max(page - 2, 1);
    let end = Math.min(page + 2, totalPages);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mt-4">
      {/* INFO */}

      <div className="text-sm text-gray-600">
        عرض
        <span className="font-semibold mx-1">{startItem}</span>
        إلى
        <span className="font-semibold mx-1">{endItem}</span>
        من
        <span className="font-semibold mx-1">{total}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* PAGE SIZE */}

        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="border rounded-lg px-2 py-1"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        {/* FIRST */}

        <button
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          className="border px-3 py-1 rounded"
        >
          «
        </button>

        {/* PREV */}

        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="border px-3 py-1 rounded"
        >
          السابق
        </button>

        {/* PAGES */}

        {getPages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 rounded border ${
              p === page ? "bg-primary text-white" : ""
            }`}
          >
            {p}
          </button>
        ))}

        {/* NEXT */}

        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border px-3 py-1 rounded"
        >
          التالي
        </button>

        {/* LAST */}

        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)}
          className="border px-3 py-1 rounded"
        >
          »
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
