import React, { useState, useEffect } from "react";
import Button from "../../../shared/ui/buttons/Button";
import SectionCard from "../../../shared/ui/layout/SectionCard";

// استيراد المكونات المنفصلة التي قمنا بفصلها بالأسفل
import BranchCoreForm from "../components/BranchCoreForm";
import BranchSettingsForm from "../components/BranchSettingsForm";

export default function BranchManagementPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("core"); // core OR settings

  // محاكاة لقائمة الفروع المتاحة للبراند (تأتي عادة من الـ API عبر getAll Branches)
  const [branchesList] = useState([
    { id: "branch_1", nameEn: "Main Downtown Branch", nameAr: "فرع وسط البلد الرئيسي", isMain: true },
    { id: "branch_2", nameEn: "Heliopolis Sub-Branch", nameAr: "فرع مصر الجديدة", isMain: false },
    { id: "branch_3", nameEn: "Zamalek Food Truck", nameAr: "عربة زمالك المتنقلة", isMain: false },
  ]);

  // معرف الفرع المختار حالياً من القائمة المنسدلة العلوبة
  const [selectedBranchId, setSelectedBranchId] = useState("branch_1");

  // هذه الحالة سوف تحمل بيانات الفرع المختار حالياً (تُجلب من الـ API بناءً على الـ id)
  const [branchData, setBranchData] = useState(null);

  // محاكاة جلب البيانات (Fetch) عند تغيير الفرع المختار من القائمة العلوية
  useEffect(() => {
    setIsEditing(false); // إلغاء وضع التعديل تلقائياً عند الانتقال لفرع آخر
    
    // هنا نقوم بعمل جلب (API Call) للفرع بناءً على selectedBranchId
    // هذا مثال لشكل البيانات المفصولة العائدة من السيرفر:
    const mockFetchedData = {
      // بيانات جدول الـ Branch الأساسي
      core: {
        _id: selectedBranchId,
        name: { en: branchesList.find(b => b.id === selectedBranchId).nameEn, ar: branchesList.find(b => b.id === selectedBranchId).nameAr },
        slug: "branch-slug-" + selectedBranchId,
        code: "BR-CODE-" + selectedBranchId.toUpperCase(),
        address: {
          country: { en: "Egypt", ar: "مصر" },
          city: { en: "Cairo", ar: "القاهرة" },
          area: { en: "District Area", ar: "المنطقة المحيطة" },
          street: { en: "Main Street", ar: "الشارع الرئيسي" },
          building: "10", floor: "G", landmark: ""
        },
        location: { type: "Point", coordinates: [31.2357, 30.0444] },
        postalCode: "11511",
        isMainBranch: selectedBranchId === "branch_1",
        manager: "64f123456789abcdef012345",
        taxIdentificationNumber: "TX-445-12",
        commercialRegisterNumber: "CR-887-EG",
        status: "active",
      },
      // بيانات جدول الـ BranchSettings + الـ DeliveryArea التابعة له
      settings: {
        contact: {
          phones: [{ label: "Reception", number: "+201000000001" }],
          whatsapp: "+201000000002",
          email: "branch@restrohub.com",
        },
        timezone: "Africa/Cairo",
        operatingHours: [
          { day: "Saturday", status: "open", periods: [{ name: "Full", openTime: "09:00", closeTime: "23:00" }] },
          { day: "Sunday", status: "open", periods: [{ name: "Full", openTime: "09:00", closeTime: "23:00" }] }
        ],
        services: {
          dineIn: { enabled: true },
          takeaway: { enabled: true },
          delivery: { enabled: true, minOrderAmount: 100, estimatedTimeMinutes: 40 },
        },
        reservation: { enabled: true, advanceBookingDays: 7, maxGuestsPerReservation: 6 },
        features: ["wifi", "parking", "air_conditioning"],
        policies: { acceptsOnlinePayment: true, acceptsCashOnDelivery: true, supportsLoyaltyProgram: true, supportsGiftCards: false },
        // بيانات الـ Delivery Area المربوطة بهذا الفرع
        deliveryArea: {
          name: { en: "Zone Local", ar: "النطاق المحلي للفرع" },
          pricingType: "fixed",
          deliveryFee: 25,
          freeDeliveryThreshold: 300,
          maxDeliveryDistanceKm: 10,
          code: "ZONE-LOCAL-01"
        }
      }
    };

    setBranchData(mockFetchedData);
  }, [selectedBranchId]);

  // دالة تحديث الحقول بشكل ديناميكي (تمرر للمكونات الفرعية)
  const handleDataChange = (section, path, value) => {
    setBranchData((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let current = updated[section]; // الانتقال إما لـ core أو settings

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    if (activeTab === "core") {
      console.log("PUT /api/branches/" + selectedBranchId, branchData.core);
    } else {
      console.log("PATCH /api/branch-settings/" + selectedBranchId, branchData.settings);
    }
    alert("Saved successfully!");
  };

  if (!branchData) return <div className="p-8 text-center text-slate-500">Loading branch configuration...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto mb-8 space-y-6 border-b border-slate-200 pb-6">
        
        {/* شريط التحكم العلوي: اختيار الفرع + التوجيه */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <nav className="text-sm text-slate-500 mb-2">
              Organization &gt; Brand &gt; <span className="text-slate-800 font-medium">Branches Management</span>
            </nav>
            
            {/* القائمة المنسدلة لاختيار الفرع المستهدف بالتعديل */}
            <div className="flex items-center gap-3">
              <label htmlFor="branch-select" className="text-sm font-bold text-slate-700 whitespace-nowrap">Active Branch:</label>
              <select
                id="branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-11 rounded-xl border border-slate-300 px-4 bg-white font-semibold text-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {branchesList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr} ({b.nameEn}) {b.isMain ? "⭐" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* أزرار الحفظ والإلغاء العامة */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Current View</Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Current Data</Button>
            )}
          </div>
        </div>

        {/* ألسنة الفصل الأساسية للتبديل بين الحقول والأجهزة التشغيلية */}
        <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border w-fit">
          <button
            onClick={() => { setActiveTab("core"); setIsEditing(false); }}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition ${
              activeTab === "core" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            📋 Core Branch Profile (بيانات الفرع الثابتة)
          </button>
          <button
            onClick={() => { setActiveTab("settings"); setIsEditing(false); }}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition ${
              activeTab === "settings" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            ⚙️ Operational Settings & Delivery (إعدادات التشغيل والتوصيل)
          </button>
        </div>
      </div>

      {/* عرض المحتوى المفصول ديناميكياً بناءً على اختيار الـ Tab */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === "core" ? (
            <BranchCoreForm 
              data={branchData.core} 
              isEditing={isEditing} 
              onChange={(path, val) => handleDataChange("core", path, val)} 
            />
          ) : (
            <BranchSettingsForm 
              data={branchData.settings} 
              isEditing={isEditing} 
              onChange={(path, val) => handleDataChange("settings", path, val)} 
            />
          )}
        </div>

        {/* الكارت الجانبي الثابت لعرض معلومات سريعة للفرع الحالي */}
        <div className="space-y-6">
          <SectionCard title="Live Monitor View">
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Selected ID</span>
                <span className="font-mono text-xs text-slate-700">{branchData.core._id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Slug Reference</span>
                <span className="text-slate-700 font-medium">{branchData.core.slug}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">System Code</span>
                <span className="font-bold text-blue-600">{branchData.core.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dine-In Support</span>
                <span className={branchData.settings.services.dineIn.enabled ? "text-green-600 font-bold" : "text-slate-400"}>
                  {branchData.settings.services.dineIn.enabled ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}