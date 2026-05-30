import POSProductCard from "./POSCard";

const products = Array.from({ length: 12 });

export default function POSProductsGrid() {
  return (
    <div
      className="
        flex-1
        overflow-y-auto
        p-4
      "
    >
      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-3
          xl:grid-cols-4
          2xl:grid-cols-5
          gap-4
        "
      >
        {products.map((_, index) => (
          <POSProductCard key={index} />
        ))}
      </div>
    </div>
  );
}