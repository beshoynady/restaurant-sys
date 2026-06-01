/**
 * ==========================================
 * Branch Manager Card
 * ------------------------------------------
 * Displays branch manager information.
 * ==========================================
 */

export default function BranchManagerCard() {
  const manager = {
    name: "Ahmed Mohamed",
    email: "manager@restaurant.com",
    role: "Branch Manager",
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-bold">
        Branch Manager
      </h3>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white">
          A
        </div>

        <div>
          <h4 className="font-semibold">
            {manager.name}
          </h4>

          <p className="text-sm text-gray-500">
            {manager.email}
          </p>

          <p className="mt-1 text-xs text-indigo-500">
            {manager.role}
          </p>
        </div>
      </div>
    </div>
  );
}