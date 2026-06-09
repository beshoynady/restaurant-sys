import { useTranslation } from "react-i18next";

export default function BranchTaxCard() {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h2 className="title">
        {t("branch.taxInformation", "Tax Information")}
      </h2>

      <div className="mt-4">
        <Field label="Tax ID" value="123456789" />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <div className="p-3 bg-surface-secondary dark:bg-slate-800 rounded-xl mt-1">
        {value}
      </div>
    </div>
  );
}