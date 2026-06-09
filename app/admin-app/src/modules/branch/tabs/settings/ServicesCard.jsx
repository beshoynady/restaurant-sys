/**
 * ==========================================
 * Services Card
 * ------------------------------------------
 * Delivery, Payment, Loyalty, etc.
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function ServicesCard({ settings }) {
  const { t } = useTranslation();

  const services = [
    {
      key: "offersOnlinePayment",
      label: t("branches.services.onlinePayment"),
    },
    {
      key: "offersCashOnDelivery",
      label: t("branches.services.cod"),
    },
    {
      key: "hasLoyaltyProgram",
      label: t("branches.services.loyalty"),
    },
    {
      key: "supportsGiftCards",
      label: t("branches.services.giftCards"),
    },
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-surface p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">
        {t("branches.settings.services")}
      </h3>

      <div className="space-y-3">
        {services.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
          >
            <span className="text-sm text-gray-600">
              {s.label}
            </span>

            <span
              className={`text-xs px-3 py-1 rounded-full ${
                settings?.[s.key]
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {settings?.[s.key] ? "ON" : "OFF"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}