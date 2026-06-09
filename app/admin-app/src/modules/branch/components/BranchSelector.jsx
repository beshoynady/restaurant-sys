// src/modules/branch/components/BranchSelector.jsx
/**
 * ==========================================
 * Branch Selector
 * ------------------------------------------
 * Switch between available branches.
 * Responsive + RTL/LTR support.
 * ==========================================
 */

import { useTranslation } from "react-i18next";

export default function BranchSelector({ selectedBranch, onChange }) {
  const { i18n } = useTranslation();

  const branches = [
    {
      id: "1",
      name: {
        en: "Main Branch",
        ar: "الفرع الرئيسي",
      },
    },
    {
      id: "2",
      name: {
        en: "Nasr City",
        ar: "مدينة نصر",
      },
    },
    {
      id: "3",
      name: {
        en: "Heliopolis",
        ar: "مصر الجديدة",
      },
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <label className="mb-2 block text-sm font-medium">Branch</label>

      <select
        value={selectedBranch.id}
        onChange={(e) => {
          const branch = branches.find((b) => b.id === e.target.value);

          onChange(branch);
        }}
        className="w-full rounded-xl border border-gray-300 bg-surface px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name[i18n.language]}
          </option>
        ))}
      </select>
    </div>
  );
}
