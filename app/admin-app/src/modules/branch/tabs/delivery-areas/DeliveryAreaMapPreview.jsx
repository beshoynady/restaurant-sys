/**
 * ==========================================
 * Delivery Area Map Preview
 * ------------------------------------------
 * Placeholder for future:
 * - Google Maps Polygon
 * - Leaflet GeoJSON
 * ==========================================
 */

export default function DeliveryAreaMapPreview({ area }) {
  return (
    <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed bg-gray-50 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800">

      {/* Future Map Layer */}
      <div className="text-center">
        <p className="font-medium">Delivery Zone Map</p>
        <p className="text-[11px] opacity-70">
          {area?.code || "NO_CODE"}
        </p>
      </div>

    </div>
  );
}