/**
 * ==========================================
 * Delivery Area Card
 * ------------------------------------------
 * Displays delivery zone summary
 * + triggers edit mode
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function DeliveryAreaCard({ area, onEdit }) {
  const { i18n, t } = useTranslation();

  return (
    <div className="rounded-3xl border bg-surface p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">
            {area.name?.[i18n.language] || "Unnamed"}
          </h3>

          <p className="text-xs text-gray-500">{area.code}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs ${
            area.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {area.isActive ? t("common.active") : t("common.inactive")}
        </span>
      </div>

      {/* INFO */}
      <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
        <p>🚚 Fee: {area.deliveryFee}</p>
        <p>📦 Min Order: {area.minimumOrderAmount}</p>
        <p>🎁 Free Above: {area.freeDeliveryThreshold || "-"}</p>
        <p>⏱ Time: {area.estimatedDeliveryTime || "-"} min</p>
        <p>📍 Max Distance: {area.maxDeliveryDistance || "-"} km</p>
      </div>

      {/* ACTION */}
      <button
        onClick={onEdit}
        className="mt-4 w-full rounded-xl bg-gray-100 py-2 text-sm hover:bg-gray-200 dark:bg-gray-800"
      >
        {t("common.edit")}
      </button>
    </div>
  );
}
