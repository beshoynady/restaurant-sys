import POSCartItem from "./POSCartItem";
import POSSummary from "./POSSummary";

export default function POSCart() {
  return (
    <aside
      className="
        hidden lg:flex
        flex-col
        h-full
        bg-surface dark:bg-gray-900
        border-r
        border-gray-200 dark:border-gray-800
        overflow-hidden
      "
    >
      {/* HEADER */}
      <div
        className="
          shrink-0
          px-5 py-4
          border-b
          border-gray-200 dark:border-gray-800
        "
      >
        <h2
          className="
            text-xl
            font-bold
            text-gray-800 dark:text-white
          "
        >
          الطلب الحالي
        </h2>
      </div>

      {/* ITEMS */}
      <div
        className="
          flex-1
          overflow-y-auto
          p-4
          space-y-3
          min-h-0
        "
      >
        {Array.from({ length: 20 }).map((_, index) => (
          <POSCartItem key={index} />
        ))}
      </div>

      {/* SUMMARY */}
      <div className="shrink-0">
        <POSSummary />
      </div>
    </aside>
  );
}
