import React from "react";

export default function TableToolbar({
  title,
  description,
  onAddClick,
  onBulkDeleteClick,
  selectedCount = 0,
  children, // يحتوي على عناصر الفلترة والبحث
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5 space-y-4">
      {/* السطر العلوي: العناوين وأزرار التحكم بالبيانات */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800">{title}</h2>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {selectedCount > 0 && (
            <button
              onClick={onBulkDeleteClick}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-all shadow-sm"
            >
              🗑️ Delete Selected ({selectedCount})
            </button>
          )}
          <button
            onClick={onAddClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5"
          >
            <span>+</span> Add New Record
          </button>
        </div>
      </div>

      {/* سطر البحث وأدوات الفلترة والفرز المرنة */}
      <div className="pt-3 border-t border-slate-50 flex flex-wrap gap-3 items-end">
        {children}
      </div>
    </div>
  );
}
