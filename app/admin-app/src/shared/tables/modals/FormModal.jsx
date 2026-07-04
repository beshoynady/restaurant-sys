import React from "react";
import { useTranslation } from "react-i18next";

export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-6 overflow-y-auto space-y-4 flex-1">{children}</div>

          {/* Actions Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              {t("Cancel") || "إلغاء"}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition"
            >
              {t("Save Changes") || "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
