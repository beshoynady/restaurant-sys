// src/shared/tables/modals/FormModal.jsx
import React from "react";

const FormModal = ({
  open,
  title,
  onClose,
  onSubmit,
  children,
  loading = false,
  submitText = "Save",
  cancelText = "Cancel",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface w-full max-w-3xl rounded-xl shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white">
          <h2 className="text-lg font-bold">{title}</h2>

          <button onClick={onClose} className="text-xl">
            ✕
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={onSubmit} className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 pt-5 border-t mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              {cancelText}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {loading ? "Loading..." : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormModal;
