/**
 * ==========================================
 * Branch Status Card
 * ------------------------------------------
 * Displays branch status.
 * ==========================================
 */

export default function BranchStatusCard() {
  const status = "active";

  const statusColors = {
    active:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",

    inactive:
      "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",

    under_maintenance:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-surface p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">Branch Status</h3>

      <div
        className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusColors[status]}`}
      >
        {status.replace("_", " ")}
      </div>

      <div className="mt-6 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
        This branch is currently operating normally.
      </div>
    </div>
  );
}
