export default function POSSummary() {
  return (
    <div
      className="
        border-t
        border-gray-200 dark:border-gray-800
        p-5
        space-y-4
      "
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">
            المجموع
          </span>

          <span className="font-bold text-gray-800 dark:text-white">
            500 ج
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">
            الضريبة
          </span>

          <span className="font-bold text-gray-800 dark:text-white">
            70 ج
          </span>
        </div>
      </div>

      <div
        className="
          flex items-center justify-between
          pt-4
          border-t
          border-gray-200 dark:border-gray-700
        "
      >
        <span
          className="
            text-lg font-bold
            text-gray-800 dark:text-white
          "
        >
          الإجمالي
        </span>

        <span
          className="
            text-2xl font-extrabold
            text-orange-500
          "
        >
          570 ج
        </span>
      </div>

      <button
        className="
          w-full
          rounded-2xl
          bg-orange-500
          hover:bg-orange-600
          text-white
          py-4
          font-bold
          transition
        "
      >
        تأكيد الطلب
      </button>
    </div>
  );
}