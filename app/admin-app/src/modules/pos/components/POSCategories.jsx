const categories = [
  "بيتزا",
  "برجر",
  "مشروبات",
  "حلويات",
  "شاورما",
  "باستا",
  "دجاج",
];

export default function POSCategories() {
  return (
    <div
      className="
        flex items-center gap-3
        overflow-x-auto
        px-4 py-4
        bg-white dark:bg-gray-900
        border-b
        border-gray-200 dark:border-gray-800
      "
    >
      {categories.map((category, index) => (
        <button
          key={index}
          className="
            whitespace-nowrap
            px-5 py-2.5
            rounded-2xl
            bg-orange-500
            text-white
            text-sm font-semibold
            hover:scale-105
            transition
          "
        >
          {category}
        </button>
      ))}
    </div>
  );
}