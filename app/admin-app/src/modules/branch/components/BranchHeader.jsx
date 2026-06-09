/**
 * ==========================================
 * Branch Header
 * ------------------------------------------
 * Displays branch title + status badge
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function BranchHeader({ branch }) {
  const { i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-surface p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
      {/* LEFT */}
      <div>
        <h1 className="text-2xl font-bold">{branch?.name?.[i18n.language]}</h1>

        <p className="text-sm text-gray-500">{branch?.slug}</p>
      </div>

      {/* STATUS */}
      <div
        className={`
          inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold
          ${
            branch.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }
        `}
      >
        {branch.status}
      </div>
    </div>
  );
}
