import React, { useState, useEffect } from "react";
import Button from "../../../shared/ui/buttons/Button";

// استيراد جميع المكونات بما فيها المكون الجديد
import TaxConfigForm from "../components/TaxConfigForm";
import ServiceChargeForm from "../components/ServiceChargeForm";
import DiscountSettingsForm from "../components/DiscountSettingsForm";
import NotificationSettingsForm from "../components/NotificationSettingsForm";
import PrintSettingsForm from "../components/PrintSettingsForm"; // 💡 الإضافة هنا

export default function BranchAdvancedSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("tax");
  const [selectedBranchId, setSelectedBranchId] = useState("branch_1");
  const [advancedSettingsData, setAdvancedSettingsData] = useState(null);

  const [branchesList] = useState([
    { id: "branch_1", nameAr: "فرع وسط البلد الرئيسي", nameEn: "Main Downtown Branch" },
    { id: "branch_2", nameAr: "فرع مصر الجديدة", nameEn: "Heliopolis Sub-Branch" },
  ]);

  useEffect(() => {
    setIsEditing(false);

    // محاكاة جلب جيع البيانات متضمنة الـ PrintSettingsSchema من السيرفر
    const mockAdvancedFetchedData = {
      taxConfig: { enabled: true, taxName: "VAT", percentage: 14, calculationMethod: "AFTER_DISCOUNT" },
      serviceCharge: { enabled: true, type: "PERCENTAGE", value: 12, appliesTo: ["DINE_IN"] },
      discountSettings: { maxManualDiscount: 25, requireManagerApproval: true, approvalThreshold: 15 },
      notificationSettings: { enabled: true, orders: { newOrder: { enabled: true } } },
      
      // 💡 إضافة كائن الطباعة الافتراضي الآمن
      printSettings: {
        printerType: "THERMAL",
        paperSize: "80mm",
        copies: { cashier: 1, preparation: 2 },
        language: "ar",
        autoPrint: true,
        status: "active"
      }
    };

    setAdvancedSettingsData(mockAdvancedFetchedData);
  }, [selectedBranchId]);

  const handleDataChange = (section, path, value) => {
    setAdvancedSettingsData((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let current = updated[section];

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
    
    switch (activeTab) {
      case "tax":
        console.log("PUT /api/v1/tax-settings", advancedSettingsData.taxConfig);
        break;
      case "service":
        console.log("PUT /api/v1/service-charge", advancedSettingsData.serviceCharge);
        break;
      case "discount":
        console.log("PUT /api/v1/discount-settings", advancedSettingsData.discountSettings);
        break;
      case "notifications":
        console.log("PUT /api/v1/notification-settings", advancedSettingsData.notificationSettings);
        break;
      case "print": // 💡 معالجة حفظ إعدادات الطباعة عبر الـ Router المرفق
        console.log(`PUT /api/v1/print-settings/${selectedBranchId}`, advancedSettingsData.printSettings);
        break;
      default:
        break;
    }
    alert("Settings saved dynamically!");
  };

  if (!advancedSettingsData) return <div className="p-8 text-center text-slate-500">Loading Configuration matrix...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto mb-8 space-y-6 border-b border-slate-200 pb-6">
        
        {/* شريط اختيار الفرع العلوي */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-700">⚙️ Configure Branch:</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-4 bg-white font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {branchesList.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.nameAr}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Tab Matrix</Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setIsEditing(true)}>Modify System Rules</Button>
            )}
          </div>
        </div>

        {/* 💡 أشرطة التبديل (Tabs) بعد إضافة زر الطباعة */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl shadow-sm border w-fit">
          <button onClick={() => { setActiveTab("tax"); setIsEditing(false); }} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === "tax" ? "bg-blue-600 text-white" : "text-slate-600"}`}>💰 Taxes</button>
          <button onClick={() => { setActiveTab("service"); setIsEditing(false); }} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === "service" ? "bg-blue-600 text-white" : "text-slate-600"}`}>🍽️ Service Charges</button>
          <button onClick={() => { setActiveTab("discount"); setIsEditing(false); }} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === "discount" ? "bg-blue-600 text-white" : "text-slate-600"}`}>📉 Discounts</button>
          <button onClick={() => { setActiveTab("notifications"); setIsEditing(false); }} className={`px-4 py-2 text-xs font-bold rounded-lg ${activeTab === "notifications" ? "bg-blue-600 text-white" : "text-slate-600"}`}>🔔 Notifications</button>
          
          {/* تبويب الطباعة المضاف */}
          <button 
            onClick={() => { setActiveTab("print"); setIsEditing(false); }} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === "print" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            🖨️ Print Settings (الطباعة)
          </button>
        </div>
      </div>

      {/* عرض المكون النشط تلقائياً */}
      <div className="max-w-4xl">
        {activeTab === "tax" && <TaxConfigForm data={advancedSettingsData.taxConfig} isEditing={isEditing} onChange={(p, val) => handleDataChange("taxConfig", p, val)} />}
        {activeTab === "service" && <ServiceChargeForm data={advancedSettingsData.serviceCharge} isEditing={isEditing} onChange={(p, val) => handleDataChange("serviceCharge", p, val)} />}
        {activeTab === "discount" && <DiscountSettingsForm data={advancedSettingsData.discountSettings} isEditing={isEditing} onChange={(p, val) => handleDataChange("discountSettings", p, val)} />}
        {activeTab === "notifications" && <NotificationSettingsForm data={advancedSettingsData.notificationSettings} isEditing={isEditing} onChange={(p, val) => handleDataChange("notificationSettings", p, val)} />}
        
        {/* 💡 حقن فورمة إعدادات الطباعة الجديدة في الـ Tab الخاص بها */}
        {activeTab === "print" && (
          <PrintSettingsForm 
            data={advancedSettingsData.printSettings} 
            isEditing={isEditing} 
            onChange={(path, val) => handleDataChange("printSettings", path, val)} 
          />
        )}
      </div>
    </div>
  );
}