/**
 * ==========================================
 * Branch Info Card
 * ==========================================
 */

import { useTranslation } from "react-i18next";

import useTheme from "../../../../shared/hooks/useTheme";

export default function BranchInfoCard({ branch }) {
  const { t, i18n } = useTranslation();

  const { isDark } = useTheme();

  return (
    <div
      className="
        rounded-3xl
        border
        border-gray-200
        bg-white
        p-6
        shadow-sm
        dark:border-gray-800
        dark:bg-gray-900
      "
    >
      <h3 className="mb-6 text-lg font-bold">{t("branches.overview.info")}</h3>

      <div className="space-y-4">
        <InfoRow
          label={t("branches.fields.name")}
          value={branch?.name?.[i18n.language]}
        />

        <InfoRow label={t("branches.fields.slug")} value={branch?.slug} />

        <InfoRow
          label={t("branches.fields.mainBranch")}
          value={branch?.isMainBranch ? t("common.yes") : t("common.no")}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
      <span className="text-sm text-gray-500">{label}</span>

      <span className="font-medium">{value}</span>
    </div>
  );
}
