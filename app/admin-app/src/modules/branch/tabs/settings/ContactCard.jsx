/**
 * ==========================================
 * Contact Card
 * ------------------------------------------
 * Displays branch contact information.
 * Based on BranchSettings Schema.
 * ==========================================
 */

import { useTranslation } from "react-i18next";
import useTheme from "../../../../shared/hooks/useTheme";

export default function ContactCard({ settings }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const contact = settings?.contact || {};

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">
        {t("branches.settings.contact")}
      </h3>

      <div className="space-y-3">
        <InfoRow
          label={t("branches.fields.email")}
          value={contact?.email}
        />

        <InfoRow
          label={t("branches.fields.whatsapp")}
          value={contact?.whatsapp}
        />

        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {t("branches.fields.phones")}
          </p>

          {contact?.phone?.length ? (
            contact.phone.map((p, i) => (
              <div
                key={i}
                className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800"
              >
                {p.label}: {p.number}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              {t("common.noData")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-sm font-medium">
        {value || "-"}
      </span>
    </div>
  );
}