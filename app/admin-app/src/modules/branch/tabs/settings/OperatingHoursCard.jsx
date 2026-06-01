/**
 * ==========================================
 * Operating Hours Card
 * ------------------------------------------
 * Weekly schedule per branch.
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function OperatingHoursCard({ settings }) {
  const { t } = useTranslation();

  const hours = settings?.operatingHours || [];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">{t("branches.settings.hours")}</h3>

      <div className="space-y-4">
        {hours.length ? (
          hours.map((day, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
            >
              <div className="mb-2 flex justify-between">
                <span className="font-semibold">{day.day}</span>

                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    day.status === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {day.status}
                </span>
              </div>

              <div className="space-y-2">
                {day.periods?.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span>{p.name}</span>
                    <span>
                      {p.openTime} - {p.closeTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">{t("common.noData")}</p>
        )}
      </div>
    </div>
  );
}
