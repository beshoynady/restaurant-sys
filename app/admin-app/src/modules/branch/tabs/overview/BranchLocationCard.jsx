/**
 * ==========================================
 * Branch Location Card
 * ------------------------------------------
 * Displays geographic coordinates.
 * ==========================================
 */

export default function BranchLocationCard() {
  const location = {
    lat: 30.0626,
    lng: 31.2497,
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">📍</div>

        <h3 className="text-lg font-bold">Location</h3>
      </div>

      <div className="space-y-4">
        <InfoRow label="Latitude" value={location.lat} />

        <InfoRow label="Longitude" value={location.lng} />
      </div>

      <div className="mt-6 h-40 rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 flex items-center justify-center">
        Map Preview
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>

      <span>{value}</span>
    </div>
  );
}
