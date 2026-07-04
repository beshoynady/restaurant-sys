import React, { useState } from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";
import EditableBadgeGroup from "../../../shared/ui/forms/EditableBadgeGroup";

export default function BranchSettingsForm({ data, isEditing, onChange }) {
  // حالة محلية لتتبع نمط الرسم (عرض المنطقة، أو إعادة رسم المضلع)
  const [mapMode, setMapMode] = useState("view"); // view OR draw

  // دالة تُستدعى عندما يقوم الـ Admin بنقر الخريطة أو تعديل نقاط المضلع (Polygon)
  const handlePolygonComplete = (newCoordinates) => {
    // newCoordinates يجب أن تكون بتنسيق [[[lng, lat], [lng, lat], ...]]
    onChange("deliveryArea.coverageArea.coordinates", newCoordinates);
  };

  return (
    <div className="space-y-6">
      {/* ... (الحقول السابقة الخاصة بالخدمات والاتصال) ... */}

      {/* 🗺️ قسم إدارة الـ Coverage Area والخريطة الجغرافية */}
      {data.services.delivery.enabled && (
        <SectionCard
          title="Delivery Coverage Area & Geofencing"
          description="Draw and define the live geographic Polygon for your delivery drivers routing."
        >
          <div className="space-y-4">
            {/* أزرار التحكم في الخريطة أثناء وضع التعديل */}
            {isEditing && (
              <div className="flex gap-2 bg-slate-100 p-2 rounded-xl w-fit mb-2">
                <button
                  type="button"
                  onClick={() => setMapMode("view")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${mapMode === "view" ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}
                >
                  👁️ View Active Zone
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode("draw")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${mapMode === "draw" ? "bg-blue-600 text-white shadow" : "text-slate-500"}`}
                >
                  ✏️ Redraw Polygon (إعادة رسم المنطقة)
                </button>
              </div>
            )}

            {/* الحاوية الرسومية للتفاعل مع الخريطة (Google Maps Drawing Manager Bridge) */}
            <div className="relative w-full h-80 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex flex-col justify-between p-4">
              {/* واجهة محاكاة الخريطة التفاعلية */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-900 flex items-center justify-center">
                <span className="text-slate-500 text-sm font-mono">
                  [ Map Engine Container Loaded: Google Maps / Leaflet ]
                </span>
              </div>

              {/* مؤشر حي لحالة المضلع الفعلي */}
              <div className="relative z-10 bg-slate-900/90 backdrop-blur text-white px-4 py-2.5 rounded-xl text-xs max-w-md border border-slate-700/50">
                <p className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                  <span>📍</span> GeoJSON Polygon Status:
                </p>
                <p className="text-slate-300 font-mono text-[11px] truncate">
                  {/* 🛑 استبدل السطر القديم المنهار بهذا السطر المحمي */}
                  Type: {data?.deliveryArea?.coverageArea?.type || "Polygon"} |
                  Detected Nodes:{" "}
                  {data?.deliveryArea?.coverageArea?.coordinates?.[0]?.length ||
                    0}{" "}
                  points
                </p>
              </div>

              {/* أداة مساعدة تظهر للمستخدم أثناء وضع الرسم الفعلي */}
              {mapMode === "draw" && (
                <div className="relative z-10 bg-blue-600 text-white p-3 rounded-xl text-xs animate-pulse self-center shadow-lg text-center">
                  💡 <strong>Drawing Mode Active:</strong> Click on the map to
                  place vertex points, then close the path to save the coverage
                  loop.
                </div>
              )}

              {/* زر محاكاة لإنهاء الرسم وتحديث الـ State (تستخدمه للتأكد من عمل الـ Handlers) */}
              {isEditing && mapMode === "draw" && (
                <button
                  type="button"
                  onClick={() => {
                    // محاكاة إحداثيات جديدة تم رسمها بواسطة المستخدم
                    const simulatedNewPolygon = [
                      [
                        [31.225, 30.042],
                        [31.255, 30.042],
                        [31.255, 30.062],
                        [31.225, 30.042],
                      ],
                    ];
                    handlePolygonComplete(simulatedNewPolygon);
                    setMapMode("view");
                  }}
                  className="relative z-10 self-end bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition"
                >
                  💾 Apply Simulated Drawing
                </button>
              )}
            </div>

            {/* عرض مصفوفة الإحداثيات الحالية أسفل الخريطة للتأكد من صحة الـ Data Binding */}
            <div className="bg-slate-50 border p-3 rounded-xl">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Live Polygon Coordinates Stream (Mongoose Schema Coordinates
                Array)
              </span>
              <div className="max-h-20 overflow-y-auto text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                <div className="max-h-20 overflow-y-auto text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                  {JSON.stringify(
                    data?.deliveryArea?.coverageArea?.coordinates || [],
                  )}
                </div>{" "}
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
