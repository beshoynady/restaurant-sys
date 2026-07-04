import React from "react";

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName = "هذا العنصر",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border animate-scale-up">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-xl font-bold">
          ⚠️
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            تأكيد عملية الحذف
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            هل أنت متأكد تماماً من رغبتك في حذف{" "}
            <span className="font-bold text-slate-800">"{itemName}"</span>؟ لا
            يمكن التراجع عن هذا الإجراء لاحقاً.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-medium text-white shadow-sm"
          >
            نعم، احذف الآن
          </button>
        </div>
      </div>
    </div>
  );
}
