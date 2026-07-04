import React, { useState } from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";
import EditableBadgeGroup from "../../../shared/ui/forms/EditableBadgeGroup";
import EditableImageInput from "../../../shared/ui/forms/EditableImageInput";
import Button from "../../../shared/ui/buttons/Button";

export default function BrandSettingsPage() {
  // حالة التحكم في وضع التعديل العام للصفحة
  const [isEditing, setIsEditing] = useState(false);

  // التبويب النشط حالياً
  const [activeTab, setActiveTab] = useState("overview");

  // الحالة المبدئية مطابقة تماماً للـ Mongoose Schemas (Brand + BrandSettings)
  const [formData, setFormData] = useState({
    // --- BRAND SCHEMA FIELDS ---
    name: { en: "The Good Burger", ar: "ذا جود برجر" },
    slug: "the-good-burger",
    logo: "https://tgb-logo-example.png", // مثال لرابط اللوجو
    businessType: "restaurant",
    cuisineType: ["american", "arabic"],
    maxBranches: 10,
    currency: "USD",
    decimalPlaces: 2,
    dashboardLanguages: ["EN", "AR"],
    defaultDashboardLanguage: "EN",
    legalName: "The Good Burger LLC",
    companyRegister: "CR-556677",
    taxIdNumber: "123-456-789",
    timezone: "Africa/Cairo",
    countryCode: "EG",
    setupStatus: "complete",
    status: "active",

    // --- BRAND SETTINGS SCHEMA FIELDS ---
    seo: {
      metaTitle: { en: "Best Burgers", ar: "أفضل برجر بالمنطقة" },
      metaDescription: { en: "Delicious fresh burgers", ar: "برجر طازج ولذيذ" },
      keywords: { en: ["burger", "fastfood"], ar: ["برجر", "وجبات سريعة"] },
      ogTitle: { en: "The Good Burger", ar: "ذا جود برجر" },
      ogDescription: { en: "Delicious fresh burgers", ar: "برجر طازج ولذيذ" },
      ogImageUrl: "",
    },
    socialMedia: {
      facebook: "https://facebook.com/tgb",
      instagram: "https://instagram.com/tgb",
      x: "https://x.com/tgb",
      linkedin: "",
      tiktok: "",
      youtube: "",
    },
    modules: {
      menu: { enabled: true },
      sales: { enabled: true },
      preparation: { enabled: true },
      seating: { enabled: true },
      payments: { enabled: true },
      delivery: { enabled: false },
      inventory: { enabled: true },
      crm: { enabled: false },
      loyalty: { enabled: false },
      hr: { enabled: false },
      financial: { enabled: false },
      accounting: { enabled: false },
      analytics: { enabled: true },
      purchasing: { enabled: false },
      production: { enabled: false },
      assets: { enabled: false },
      reservations: { enabled: true },
      feedback: { enabled: false },
    },
    maintenanceMode: false,
    security: {
      allowMultipleSessions: true,
      sessionTimeoutMinutes: 120,
    },
  });

  // دالة لتحديث الحقول العادية والمركبة (Nested Paths)
  const handleInputChange = (path, value) => {
    setFormData((prev) => {
      const keys = path.split(".");
      const updated = { ...prev };
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // دالة خاصة بالـ Badges أو المجموعات متعددة الخيارات (Array Toggle)
  const handleToggleArrayItem = (path, item) => {
    setFormData((prev) => {
      const keys = path.split(".");
      const updated = { ...prev };
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      const currentArray = current[keys[keys.length - 1]] || [];
      if (currentArray.includes(item)) {
        current[keys[keys.length - 1]] = currentArray.filter((i) => i !== item);
      } else {
        current[keys[keys.length - 1]] = [...currentArray, item];
      }
      return updated;
    });
  };

  // دالة حفظ التغييرات وإرسالها للـ API
  const handleSave = () => {
    setIsEditing(false);
    console.log("Saved Data to API:", formData);
    // هنا يمكنك استدعاء router.patch الـ settings والـ brand بناءً على الـ Endpoints الخاصة بك
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-800">
      {/* الهيدر العلوي بدون السايدبار */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <nav className="text-sm text-slate-500 mb-2 flex gap-2">
            <span>Organization</span> &gt; <span>Brand</span> &gt; <span className="text-slate-800 font-medium">Brand Settings</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight">Brand Settings</h1>
          <p className="text-slate-500 mt-1">Manage your brand preferences, modules and system configurations.</p>
        </div>

        {/* أزرار التحكم بالتعديل والحفظ */}
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Configuration</Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* المحتوى الرئيسي للـ Tabs والإدخال (ياخذ ثلثي المساحة) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* شريط الانتقال بين التبويبات Tabs Bar */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px bg-white p-2 rounded-2xl shadow-sm">
            {[
              { id: "overview", label: "Overview" },
              { id: "modules", label: "Modules" },
              { id: "seo", label: "SEO & Social" },
              { id: "security", label: "Security & Financial" },
              { id: "legal", label: "Legal & System" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <SectionCard title="Brand Information" description="Basic essential details about your commercial brand.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableImageInput
                  label="Brand Logo"
                  value={formData.logo}
                  path="logo"
                  isEditing={isEditing}
                  onChange={handleInputChange}
                />
                <EditableInput
                  label="Name (English) *"
                  value={formData.name.en}
                  path="name.en"
                  isEditing={isEditing}
                  onChange={handleInputChange}
                />
                <EditableInput
                  label="Name (Arabic) *"
                  value={formData.name.ar}
                  path="name.ar"
                  isEditing={isEditing}
                  onChange={handleInputChange}
                />
                <EditableInput
                  label="Slug (Auto-generated) *"
                  value={formData.slug}
                  path="slug"
                  isEditing={isEditing}
                  onChange={handleInputChange}
                />
                <EditableSelect
                  label="Business Type"
                  value={formData.businessType}
                  path="businessType"
                  options={["restaurant", "cafe", "fast_food", "bakery", "food_truck", "cloud_kitchen", "bar", "other"]}
                  isEditing={isEditing}
                  onChange={handleInputChange}
                />
                <div className="md:col-span-2">
                  <EditableBadgeGroup
                    label="Cuisine Type"
                    values={formData.cuisineType}
                    options={["arabic", "italian", "mexican", "asian", "american", "mediterranean", "fusion"]}
                    isEditing={isEditing}
                    onToggle={(item) => handleToggleArrayItem("cuisineType", item)}
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* TAB 2: MODULES */}
          {activeTab === "modules" && (
            <SectionCard title="System Modules" description="Enable or disable specific features and dashboards for this brand.">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(formData.modules).map((moduleKey) => (
                  <div key={moduleKey} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-sm font-medium capitalize text-slate-700">{moduleKey}</span>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={formData.modules[moduleKey].enabled}
                      onChange={(e) => handleInputChange(`modules.${moduleKey}.enabled`, e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer disabled:opacity-60"
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* TAB 3: SEO & SOCIAL MEDIA */}
          {activeTab === "seo" && (
            <div className="space-y-6">
              <SectionCard title="Search Engine Optimization (SEO)" description="Configure meta data for search indexing.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableInput label="Meta Title (EN)" value={formData.seo.metaTitle.en} path="seo.metaTitle.en" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Meta Title (AR)" value={formData.seo.metaTitle.ar} path="seo.metaTitle.ar" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Meta Description (EN)" value={formData.seo.metaDescription.en} path="seo.metaDescription.en" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Meta Description (AR)" value={formData.seo.metaDescription.ar} path="seo.metaDescription.ar" isEditing={isEditing} onChange={handleInputChange} />
                </div>
              </SectionCard>

              <SectionCard title="Social Media Links" description="Brand links across official platforms.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(formData.socialMedia).map((platform) => (
                    <EditableInput
                      key={platform}
                      label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      value={formData.socialMedia[platform]}
                      path={`socialMedia.${platform}`}
                      isEditing={isEditing}
                      onChange={handleInputChange}
                    />
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 4: SECURITY & FINANCIAL */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <SectionCard title="Financial Settings" description="Configure default currency and decimal formats.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableSelect
                    label="Currency *"
                    value={formData.currency}
                    path="currency"
                    options={["USD", "EUR", "GBP", "EGP", "SAR", "AED", "JPY", "CNY", "INR"]}
                    isEditing={isEditing}
                    onChange={handleInputChange}
                  />
                  <EditableNumberInput
                    label="Decimal Places"
                    value={formData.decimalPlaces}
                    path="decimalPlaces"
                    isEditing={isEditing}
                    onChange={handleInputChange}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Security & Sessions" description="Manage active login restrictions.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableNumberInput
                    label="Session Timeout (Minutes)"
                    value={formData.security.sessionTimeoutMinutes}
                    path="security.sessionTimeoutMinutes"
                    isEditing={isEditing}
                    onChange={handleInputChange}
                  />
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mt-6">
                    <span className="text-sm font-medium text-slate-700">Allow Multiple Sessions</span>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={formData.security.allowMultipleSessions}
                      onChange={(e) => handleInputChange("security.allowMultipleSessions", e.target.checked)}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 5: LEGAL & SYSTEM */}
          {activeTab === "legal" && (
            <div className="space-y-6">
              <SectionCard title="Company & Legal Information" description="Official company registration details.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableInput label="Legal Name *" value={formData.legalName} path="legalName" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Company Register Number" value={formData.companyRegister} path="companyRegister" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Tax Identification Number" value={formData.taxIdNumber} path="taxIdNumber" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Country Code" value={formData.countryCode} path="countryCode" isEditing={isEditing} onChange={handleInputChange} />
                  <EditableInput label="Timezone" value={formData.timezone} path="timezone" isEditing={isEditing} onChange={handleInputChange} />
                </div>
              </SectionCard>

              <SectionCard title="System Control" description="Advanced administration triggers.">
                <div className="flex items-center justify-between p-4 border border-red-100 bg-red-50/50 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">Maintenance Mode</h4>
                    <p className="text-xs text-red-700">Block public access to dashboards during updates.</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.maintenanceMode}
                    onChange={(e) => handleInputChange("maintenanceMode", e.target.checked)}
                    className="w-5 h-5 accent-red-600 cursor-pointer"
                  />
                </div>
              </SectionCard>
            </div>
          )}

        </div>

        {/* الكارت الجانبي (ياخذ ثلث المساحة): ملخص سريع ونظرة عامة على البيانات */}
        <div className="space-y-6">
          <SectionCard title="Quick Summary">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                <span className="text-slate-500">Brand Name</span>
                <span className="font-semibold text-slate-800">{formData.name.en}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                  formData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>{formData.status}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                <span className="text-slate-500">Setup Progress</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 capitalize">{formData.setupStatus}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                <span className="text-slate-500">Max Branches</span>
                <span className="font-semibold text-slate-800">{formData.maxBranches}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                <span className="text-slate-500">Default Currency</span>
                <span className="font-semibold text-slate-800">{formData.currency}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                <span className="text-slate-500">Default Language</span>
                <span className="font-semibold text-slate-800">{formData.defaultDashboardLanguage}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-slate-500">Maintenance Mode</span>
                <span className={`font-semibold ${formData.maintenanceMode ? "text-red-600" : "text-green-600"}`}>
                  {formData.maintenanceMode ? "On" : "Off"}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* كارت حالة الاكتمال كما هو بالصورة الأصلية */}
          <SectionCard title="Brand Setup Progress">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium mb-1">
                <span className="text-green-600">All setup steps completed!</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 mt-4">
                <li className="flex items-center gap-2 text-green-600">✓ Basic Information Completed</li>
                <li className="flex items-center gap-2 text-green-600">✓ Financial Settings Configured</li>
                <li className="flex items-center gap-2 text-green-600">✓ Modules and SEO Set up</li>
              </ul>
            </div>
          </SectionCard>
        </div>

      </div>
    </div>
  );
}