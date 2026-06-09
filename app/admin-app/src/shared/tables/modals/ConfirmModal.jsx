// src/shared/tables/modals/ConfirmModal.jsx
import React from "react";

const ConfirmModal = ({
  open,
  title = "Confirm",
  message,
  onConfirm,
  onCancel,
  loading = false,
  confirmText = "Delete",
  cancelText = "Cancel",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface w-[420px] rounded-xl p-5 shadow-xl">
        <h2 className="text-lg font-bold mb-2">{title}</h2>

        <p className="text-gray-600 mb-5">{message}</p>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">
            {cancelText}
          </button>

          <button
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
