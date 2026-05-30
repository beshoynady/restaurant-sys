import { useTranslation } from "react-i18next";

import POSHeader from "../components/POSHeader";
import POSCategories from "../components/POSCategories";
import POSProductsGrid from "../components/POSProductsGrid";
import POSCart from "../components/POSCart";

export default function POSLayout() {
  const { i18n } = useTranslation();

  const isArabic = i18n.language === "ar";

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="
        h-[calc(100vh-64px)]
        overflow-hidden
        bg-gray-100
        dark:bg-gray-950
        transition-colors duration-300
      "
    >
      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-[1fr_420px]
          h-full
        "
      >
        {/* LEFT SIDE */}
        <div className="flex flex-col h-full overflow-hidden">
          <POSHeader />

          <POSCategories />

          <POSProductsGrid />
        </div>

        {/* RIGHT SIDE */}
        <POSCart />
      </div>
    </section>
  );
}