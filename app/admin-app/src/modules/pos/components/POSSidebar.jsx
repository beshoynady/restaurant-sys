import React, { useContext } from "react";
import { ThemeContext } from "../../../context/theme/ThemeContext";

const POSSidebar = () => {
  const { isDark } = useContext(ThemeContext);

  return (
    <aside
      className={`
        w-[380px]
        hidden
        lg:flex
        flex-col
        border-l
        ${
          isDark
            ? "bg-zinc-900 border-zinc-800"
            : "bg-surface border-zinc-200"
        }
      `}
    >
      {/* HEADER */}
      <div className="h-16 border-b border-zinc-800 flex items-center px-4">
        <h2 className="font-bold text-lg text-cyan-500">
          الطلب الحالي
        </h2>
      </div>

      {/* CART ITEMS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        <div className="rounded-xl bg-zinc-800 p-3 text-white">
          منتج تجريبي
        </div>

      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-zinc-800 space-y-3">

        <div className="flex items-center justify-between text-lg font-bold">
          <span className={isDark ? "text-white" : "text-zinc-800"}>
            الإجمالي
          </span>

          <span className="text-cyan-500">
            250 ج
          </span>
        </div>

        <button
          className="
            w-full
            h-12
            rounded-xl
            bg-cyan-500
            hover:bg-cyan-600
            text-white
            font-bold
            transition
          "
        >
          تأكيد الطلب
        </button>

      </div>
    </aside>
  );
};

export default POSSidebar;