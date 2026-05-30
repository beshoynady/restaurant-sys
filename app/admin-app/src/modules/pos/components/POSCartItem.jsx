import { Plus, Minus, Trash2 } from "lucide-react";

export default function POSCartItem() {
  return (
    <div
      className="
        rounded-2xl
        border border-gray-200 dark:border-gray-800
        bg-gray-50 dark:bg-gray-800
        p-3
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">
            تشيز برجر
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            حجم كبير
          </p>
        </div>

        <button
          className="
            p-2 rounded-xl
            bg-red-100 dark:bg-red-500/10
            text-red-500
          "
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <button
            className="
              w-8 h-8 rounded-xl
              bg-gray-200 dark:bg-gray-700
              flex items-center justify-center
            "
          >
            <Minus size={16} />
          </button>

          <span className="font-bold text-gray-800 dark:text-white">
            2
          </span>

          <button
            className="
              w-8 h-8 rounded-xl
              bg-orange-500
              text-white
              flex items-center justify-center
            "
          >
            <Plus size={16} />
          </button>
        </div>

        <h4 className="font-extrabold text-orange-500">
          240 ج
        </h4>
      </div>
    </div>
  );
}