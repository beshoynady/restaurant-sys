/**
 * ==========================================
 * Features Card
 * ------------------------------------------
 * Branch amenities (WiFi, Parking, etc.)
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function FeaturesCard({ settings }) {
  const { t } = useTranslation();

  const features = settings?.features || [];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">
        {t("branches.settings.features")}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {features.length ? (
          features.map((f, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 text-sm font-medium ${
                f.enabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {f.name}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">
            {t("common.noData")}
          </p>
        )}
      </div>
    </div>
  );
}