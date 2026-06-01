/**
 * ==========================================
 * Branch Legal Card
 * ------------------------------------------
 * Tax and Commercial Registration.
 * ==========================================
 */

export default function BranchLegalCard() {
  const legal = {
    taxId: "123456789",
    commercialRegister: "CR-987654",
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">Legal Information</h3>

      <div className="space-y-4">
        <InfoRow label="Tax Number" value={legal.taxId} />

        <InfoRow label="Commercial Register" value={legal.commercialRegister} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
      <span className="text-gray-500">{label}</span>

      <span className="font-medium">{value}</span>
    </div>
  );
}
