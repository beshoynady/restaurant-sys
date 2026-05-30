export default function POSProductCard() {
  return (
    <div
      className="
        group
        overflow-hidden
        rounded-3xl
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        shadow-sm
        hover:shadow-xl
        transition-all duration-300
        cursor-pointer
      "
    >
      {/* IMAGE */}
      <div className="relative h-40 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd"
          alt="product"
          className="
            w-full h-full object-cover
            group-hover:scale-110
            transition duration-500
          "
        />

        <div
          className="
            absolute top-3 left-3
            bg-orange-500
            text-white
            text-xs font-bold
            px-3 py-1
            rounded-full
          "
        >
          HOT
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="
              text-sm md:text-base
              font-bold
              text-gray-800 dark:text-white
            "
          >
            تشيز برجر
          </h3>

          <span
            className="
              text-orange-500
              font-extrabold
              text-sm
            "
          >
            120 ج
          </span>
        </div>

        <p
          className="
            mt-2
            text-xs
            text-gray-500 dark:text-gray-400
            line-clamp-2
          "
        >
          برجر لحم مع الجبنة والخضار وصوص خاص
        </p>

        {/* SIZES */}
        <div className="flex gap-2 mt-4">
          <button
            className="
              flex-1
              rounded-xl
              bg-orange-500
              text-white
              py-2
              text-xs
              font-semibold
            "
          >
            S
          </button>

          <button
            className="
              flex-1
              rounded-xl
              bg-gray-100 dark:bg-gray-800
              text-gray-700 dark:text-white
              py-2
              text-xs
              font-semibold
            "
          >
            M
          </button>

          <button
            className="
              flex-1
              rounded-xl
              bg-gray-100 dark:bg-gray-800
              text-gray-700 dark:text-white
              py-2
              text-xs
              font-semibold
            "
          >
            L
          </button>
        </div>
      </div>
    </div>
  );
}
