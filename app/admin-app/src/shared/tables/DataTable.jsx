// src/shared/tables/DataTable.jsx
import React from "react";
import { useTranslation } from "react-i18next";

const DataTable = ({
  columns = [],
  data = [],
  loading = false,

  selectable = false,

  selectedRows = [],

  onSelectRow,
  onSelectAll,

  renderActions,

  title,

  emptyText = "لا توجد بيانات",

  rowKey = "_id",

  onRowClick,
}) => {
  const { t } = useTranslation();

  const safeRowKey = (row) => row?.[rowKey] ?? row?.id;

  const allSelected =
    data.length > 0 &&
    data.every((item) => selectedRows.includes(safeRowKey(item)));

  const totalCols =
    columns.length + (selectable ? 1 : 0) + (renderActions ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {title && <div className="px-4 py-3 border-b font-semibold">{title}</div>}

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-12 p-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                  />
                </th>
              )}

              <th className="px-4 py-3 text-start whitespace-nowrap">#</th>

              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-start whitespace-nowrap"
                >
                  {column.title}
                </th>
              ))}

              {renderActions && (
                <th className="w-40 px-4 py-3 text-center">{t("actions")}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="text-center p-8 text-gray-500"
                >
                  {t("loading")}...
                </td>
              </tr>
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="text-center p-8 text-gray-500"
                >
                  {emptyText}
                </td>
              </tr>
            )}

            {!loading &&
              data.map((row, i) => (
                <tr
                  key={safeRowKey(row)}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(safeRowKey(row))}
                        onChange={() => onSelectRow?.(safeRowKey(row))}
                      />
                    </td>
                  )}

                  <td className="px-4 py-3 text-start">{i + 1}</td>

                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      {column.render
                        ? column.render(row)
                        : (row[column.key] ?? "--")}
                    </td>
                  ))}

                  {renderActions && (
                    <td
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderActions(row)}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
