/**
 * ==========================================
 * Policies Card
 * ------------------------------------------
 * Reservation, Pickup, etc.
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function PoliciesCard({ settings }) {
  const { t } = useTranslation();

  const policies = [
    "usesReservationSystem",
    "offersCurbsidePickup",
    "offersOnlinePayment",
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-surface p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">
        {t("branches.settings.policies")}
      </h3>

      <div className="space-y-3">
        {policies.map((p, i) => (
          <div
            key={i}
            className="flex justify-between"
          >
            <span className="text-sm text-gray-600">
              {p}
            </span>

            <span
              className={`text-xs px-3 py-1 rounded-full ${
                settings?.[p]
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {settings?.[p] ? "YES" : "NO"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}