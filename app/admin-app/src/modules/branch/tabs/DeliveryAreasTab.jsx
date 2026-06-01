/**
 * ==========================================
 * Delivery Areas Tab (FINAL VERSION)
 * ------------------------------------------
 * Handles:
 * - List
 * - Create
 * - Edit
 * - Delete (future)
 * ==========================================
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import DeliveryAreaCard from "./delivery-areas/DeliveryAreaCard";
import DeliveryAreaFormModal from "./delivery-areas/DeliveryAreaFormModal";

export default function DeliveryAreasTab() {
  const { t } = useTranslation();

  // ============================
  // MOCK DATA (replace API later)
  // ============================
  const [areas, setAreas] = useState([
    {
      _id: "1",
      name: { en: "Nasr City", ar: "مدينة نصر" },
      code: "ZONE_1",
      deliveryFee: 25,
      minimumOrderAmount: 100,
      freeDeliveryThreshold: 300,
      estimatedDeliveryTime: 45,
      maxDeliveryDistance: 10,
      isActive: true,
    },
  ]);

  const [selected, setSelected] = useState(null);

  // ============================
  // SAVE (create/update logic)
  // ============================
  const handleSave = (payload) => {
    if (selected?._id) {
      // UPDATE
      setAreas((prev) =>
        prev.map((a) =>
          a._id === selected._id ? { ...a, ...payload } : a
        )
      );
    } else {
      // CREATE
      setAreas((prev) => [
        ...prev,
        { _id: Date.now().toString(), ...payload },
      ]);
    }

    setSelected(null);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {t("delivery.areas")}
        </h2>

        <button
          onClick={() => setSelected({})}
          className="rounded-xl bg-black px-4 py-2 text-sm text-white"
        >
          + {t("common.add")}
        </button>
      </div>

      {/* GRID */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <DeliveryAreaCard
            key={area._id}
            area={area}
            onEdit={() => setSelected(area)}
          />
        ))}
      </div>

      {/* MODAL */}
      {selected && (
        <DeliveryAreaFormModal
          data={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}