import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, Building2, ShoppingBag, Utensils, Factory, 
  Boxes, Wallet, Users, HeartHandshake, Armchair, HardDrive, 
  ShieldCheck, Settings, ChevronDown, ChevronLeft, ChevronRight,
  LogOut, Sun, Moon, Languages, FileText
} from "lucide-react";

export default function AdminSidebar({ isDark, toggleTheme, isArabic, toggleLanguage }) {
  // تتبع القوائم المفتوحة حالياً (Sub-lists)
  const [openMenus, setOpenMenus] = useState({});

  const toggleSubMenu = (menuKey) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // هيكلة موديولات المشروع إلى قوائم رئيسية وفرعية متكاملة
  const sidebarData = [
    {
      key: "dashboard",
      titleAr: "لوحة التحكم",
      titleEn: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard"
    },
    {
      key: "organization",
      titleAr: "الهيكل التنظيمي",
      titleEn: "Organization",
      icon: Building2,
      children: [
        { titleAr: "إدارة الفروع", titleEn: "Branches", path: "/admin/org/branches" },
        { titleAr: "إعدادات الفروع", titleEn: "Branch Settings", path: "/admin/org/branch-settings" },
        { titleAr: "العلامات التجارية", titleEn: "Brands", path: "/admin/org/brands" },
        { titleAr: "إعدادات العلامة", titleEn: "Brand Settings", path: "/admin/org/brand-settings" },
        { titleAr: "مناطق التوصيل", titleEn: "Delivery Areas", path: "/admin/org/delivery-areas" },
      ]
    },
    {
      key: "sales",
      titleAr: "إدارة المبيعات",
      titleEn: "Sales Management",
      icon: ShoppingBag,
      children: [
        { titleAr: "الطلبات الحالية", titleEn: "Orders", path: "/admin/sales/orders" },
        { titleAr: "الفواتير الصادرة", titleEn: "Invoices", path: "/admin/sales/invoices" },
        { titleAr: "مرتجع المبيعات", titleEn: "Sales Returns", path: "/admin/sales/returns" },
        { titleAr: "العروض والترقيات", titleEn: "Promotions", path: "/admin/sales/promotions" },
        { titleAr: "إعدادات المبيعات", titleEn: "Sales Settings", path: "/admin/sales/settings" },
      ]
    },
    {
      key: "menu_prep",
      titleAr: "المنيو وأقسام التحضير",
      titleEn: "Menu & Preparation",
      icon: Utensils,
      children: [
        { titleAr: "فئات المنيو", titleEn: "Menu Categories", path: "/admin/menu/categories" },
        { titleAr: "المنتجات والوجبات", titleEn: "Products", path: "/admin/menu/products" },
        { titleAr: "تقييمات المنتجات", titleEn: "Product Reviews", path: "/admin/menu/reviews" },
        { titleAr: "وصفات الطعام (Recipes)", titleEn: "Recipes", path: "/admin/menu/recipes" },
        { titleAr: "أقسام التحضير (مطبخ/بار)", titleEn: "Prep Sections", path: "/admin/prep/sections" },
        { titleAr: "تذاكر التحضير (KDS)", titleEn: "Prep Tickets", path: "/admin/prep/tickets" },
        { titleAr: "مرتجعات التحضير", titleEn: "Prep Returns", path: "/admin/prep/returns" },
      ]
    },
    {
      key: "production",
      titleAr: "إدارة الإنتاج والتصنيع",
      titleEn: "Production Node",
      icon: Factory,
      children: [
        { titleAr: "أوامر الإنتاج المركزي", titleEn: "Production Orders", path: "/admin/production/orders" },
        { titleAr: "وصفات التصنيع الكتلية", titleEn: "Production Recipes", path: "/admin/production/recipes" },
        { titleAr: "سجلات الإنتاج والتشغيل", titleEn: "Production Records", path: "/admin/production/records" },
      ]
    },
    {
      key: "inventory_purchasing",
      titleAr: "المخازن والمشتريات",
      titleEn: "Inventory & Logistics",
      icon: Boxes,
      children: [
        { titleAr: "إدارة المستودعات", titleEn: "Warehouses", path: "/admin/inventory/warehouses" },
        { titleAr: "الأصناف المخزنية", titleEn: "Stock Items", path: "/admin/inventory/items" },
        { titleAr: "فئات المخزون", titleEn: "Stock Categories", path: "/admin/inventory/categories" },
        { titleAr: "حركة وتوزيع المخزون", titleEn: "Inventory Ledger", path: "/admin/inventory/ledger" },
        { titleAr: "طلبات التحويل الداخلي", titleEn: "Stock Transfers", path: "/admin/inventory/transfers" },
        { titleAr: "جرد المخزون الفعلي", titleEn: "Inventory Count", path: "/admin/inventory/count" },
        { titleAr: "معدلات الاستهلاك اليومي", titleEn: "Consumption", path: "/admin/inventory/consumption" },
        { titleAr: "الموردين", titleEn: "Suppliers", path: "/admin/purchasing/suppliers" },
        { titleAr: "فواتير المشتريات", titleEn: "Purchase Invoices", path: "/admin/purchasing/invoices" },
        { titleAr: "مرتجع المشتريات", titleEn: "Purchase Returns", path: "/admin/purchasing/returns" },
      ]
    },
    {
      key: "finance_accounting",
      titleAr: "المالية والحسابات العامة",
      titleEn: "Finance & ERP Ledger",
      icon: Wallet,
      children: [
        { titleAr: "شجرة الحسابات", titleEn: "Chart of Accounts", path: "/admin/accounting/accounts" },
        { titleAr: "القيود اليومية", titleEn: "Journal Entries", path: "/admin/accounting/journal" },
        { titleAr: "دفتر الأستاذ", titleEn: "Ledger", path: "/admin/accounting/ledger" },
        { titleAr: "مراكز التكلفة", titleEn: "Cost Centers", path: "/admin/accounting/cost-centers" },
        { titleAr: "الفترات المحاسبية", titleEn: "Accounting Periods", path: "/admin/accounting/periods" },
        { titleAr: "الخزائن ونقاط البيع", titleEn: "Cash Registers", path: "/admin/finance/registers" },
        { titleAr: "الحسابات البنكية", titleEn: "Bank Accounts", path: "/admin/finance/banks" },
        { titleAr: "شفتات الكاشيرات", titleEn: "Cashier Shifts", path: "/admin/finance/shifts" },
        { titleAr: "التحويلات المالية الداخلية", titleEn: "Cash Transfers", path: "/admin/finance/transfers" },
        { titleAr: "التقارير المالية والختامية", titleEn: "Financial Reports", path: "/admin/accounting/reports" },
      ]
    },
    {
      key: "hr",
      titleAr: "الموارد البشرية HR",
      titleEn: "Human Resources",
      icon: Users,
      children: [
        { titleAr: "ملفات الموظفين", titleEn: "Employees Portal", path: "/admin/hr/employees" },
        { titleAr: "الإدارات والأقسام", titleEn: "Departments", path: "/admin/hr/departments" },
        { titleAr: "المسميات الوظيفية", titleEn: "Job Titles", path: "/admin/hr/jobs" },
        { titleAr: "سجلات الحضور والانصراف", titleEn: "Attendance Records", path: "/admin/hr/attendance" },
        { titleAr: "شفتات وجداول العمل", titleEn: "Work Shifts", path: "/admin/hr/shifts" },
        { titleAr: "طلبات الإجازات", titleEn: "Leave Requests", path: "/admin/hr/leaves" },
        { titleAr: "مسيرات الرواتب (Payroll)", titleEn: "Payroll Ledger", path: "/admin/hr/payroll" },
        { titleAr: "سلف ومقدمات الموظفين", titleEn: "Employee Advances", path: "/admin/hr/advances" },
      ]
    },
    {
      key: "crm_loyalty",
      titleAr: "العملاء وبرامج الولاء",
      titleEn: "CRM & Loyalty Hub",
      icon: HeartHandshake,
      children: [
        { titleAr: "عملاء الأونلاين", titleEn: "Online Customers", path: "/admin/crm/online" },
        { titleAr: "عملاء الصالة/المحلي", titleEn: "Offline Customers", path: "/admin/crm/offline" },
        { titleAr: "مركز الرسائل والتنبيهات", titleEn: "Messages Box", path: "/admin/crm/messages" },
        { titleAr: "نقاط ولاء العملاء", titleEn: "Customer Loyalty", path: "/admin/loyalty/points" },
        { titleAr: "مكافآت الولاء", titleEn: "Loyalty Rewards", path: "/admin/loyalty/rewards" },
      ]
    },
    {
      key: "seating",
      titleAr: "إدارة الصالة والطاولات",
      titleEn: "Seating & Tables",
      icon: Armchair,
      children: [
        { titleAr: "مناطق وتوزيع الصالات", titleEn: "Dining Areas", path: "/admin/seating/areas" },
        { titleAr: "هندسة وإدارة الطاولات", titleEn: "Tables Grid", path: "/admin/seating/tables" },
        { titleAr: "الحجوزات المسبقة", titleEn: "Reservations", path: "/admin/seating/reservations" },
      ]
    },
    {
      key: "assets",
      titleAr: "الأصول الثابتة",
      titleEn: "Fixed Assets",
      icon: HardDrive,
      children: [
        { titleAr: "سجل الأصول الثابتة", titleEn: "Assets Registry", path: "/admin/assets/list" },
        { titleAr: "فئات الأصول", titleEn: "Asset Categories", path: "/admin/assets/categories" },
        { titleAr: "إهلاك الأصول الدوري", titleEn: "Asset Depreciation", path: "/admin/assets/depreciation" },
        { titleAr: "صيانة وإصلاح الأصول", titleEn: "Asset Maintenance", path: "/admin/assets/maintenance" },
        { titleAr: "فواتير شراء الأصول", titleEn: "Asset Invoices", path: "/admin/assets/invoices" },
      ]
    },
    {
      key: "iam",
      titleAr: "الصلاحيات والمستخدمين",
      titleEn: "Security & IAM",
      icon: ShieldCheck,
      children: [
        { titleAr: "حسابات المستخدمين", titleEn: "User Accounts", path: "/admin/security/users" },
        { titleAr: "الأدوار والصلاحيات (Roles)", titleEn: "Roles & Permissions", path: "/admin/security/roles" },
      ]
    },
    {
      key: "system_settings",
      titleAr: "إعدادات وتكوين النظام",
      titleEn: "System Configurations",
      icon: Settings,
      children: [
        { titleAr: "إعدادات الضرائب والرسوم", titleEn: "Tax Config", path: "/admin/settings/tax" },
        { titleAr: "رسوم الخدمة (Service Charge)", titleEn: "Service Charges", path: "/admin/settings/service-charge" },
        { titleAr: "قواعد الخصومات اللحظية", titleEn: "Discount Rules", path: "/admin/settings/discounts" },
        { titleAr: "إعدادات الطابعات والـ KOT", titleEn: "Print Engine", path: "/admin/settings/printing" },
        { titleAr: "قنوات وبوابات الدفع", titleEn: "Payment Gateways", path: "/admin/settings/payments" },
        { titleAr: "إعداد التكوين الأولي للسيستم", titleEn: "System Initial Setup", path: "/admin/settings/setup" },
      ]
    }
  ];

  return (
    <aside 
      className={`w-72 h-screen flex flex-col justify-between border-e transition-colors duration-300 shadow-xl ${
        isDark ? "bg-[#090d1a] border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
      }`}
    >
      {/* 1. رأس السايد بار (Logo Area) */}
      <div className={`p-5 flex items-center gap-3 border-b ${isDark ? "border-slate-800/60" : "border-slate-100"}`}>
        <div className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-xl shadow-md">
          <Factory className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-black text-sm tracking-wide bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            SMART MENU ERP
          </h2>
          <p className="text-[10px] text-slate-400 font-medium">نظام الإدارة المتكامل v24.14</p>
        </div>
      </div>

      {/* 2. حاوية القوائم (Scrollable Menu Items Area) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {sidebarData.map((menu) => {
          const Icon = menu.icon;
          const hasChildren = menu.children && menu.children.length > 0;
          const isOpen = !!openMenus[menu.key];

          return (
            <div key={menu.key} className="flex flex-col">
              {/* القائمة الرئيسية أو العنصر المستقل */}
              <button
                onClick={() => hasChildren ? toggleSubMenu(menu.key) : null}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isOpen 
                    ? "bg-indigo-600/10 text-indigo-400" 
                    : isDark ? "hover:bg-slate-800/50 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isOpen ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>{isArabic ? menu.titleAr : menu.titleEn}</span>
                </div>

                {hasChildren && (
                  <div>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                    ) : isArabic ? (
                      <ChevronLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                )}
              </button>

              {/* القائمة الفرعية (Sub-list) مع تأثيرات فتح انسيابية */}
              {hasChildren && isOpen && (
                <div className={`mt-1 font-medium text-[11px] space-y-0.5 border-s-2 mx-5 ${
                  isDark ? "border-slate-800" : "border-slate-200"
                }`}>
                  {menu.children.map((subItem, index) => (
                    <a
                      key={index}
                      href={subItem.path}
                      className={`block py-2 px-4 transition-all ${
                        isArabic ? "hover:translate-x-[-4px]" : "hover:translate-x-[4px]"
                      } ${
                        isDark ? "text-slate-400 hover:text-cyan-400" : "text-slate-600 hover:text-indigo-600"
                      }`}
                    >
                      {isArabic ? subItem.titleAr : subItem.titleEn}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. تذييل السايد بار (الأدوات والملف الشخصي والتحكم باللغات والثيمز) */}
      <div className={`p-3 border-t space-y-3 ${isDark ? "border-slate-800/80 bg-[#070a14]" : "border-slate-100 bg-slate-50"}`}>
        
        {/* أزرار تغيير التفضيلات اللحظية السريعة وعناصر المظهر */}
        <div className="grid grid-cols-2 gap-1.5">
          <button 
            onClick={toggleTheme}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10px] font-bold transition ${
              isDark ? "bg-[#111930] border-slate-800 text-amber-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isArabic ? "المظهر" : "Theme"}</span>
          </button>

          <button 
            onClick={toggleLanguage}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10px] font-bold transition ${
              isDark ? "bg-[#111930] border-slate-800 text-cyan-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{isArabic ? "English" : "العربية"}</span>
          </button>
        </div>

        {/* كارت المستخدم الحالي وزر تسجيل الخروج النهائي */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-black text-white text-xs">
              AD
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-200">{isArabic ? "أحمد الرفاعي" : "Ahmed Al-Rifai"}</p>
              <p className="text-[9px] text-emerald-500 font-bold">{isArabic ? "المدير العام المالك" : "Super Admin"}</p>
            </div>
          </div>
          
          <button 
            className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
            title={isArabic ? "تسجيل الخروج" : "Logout"}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </aside>
  );
}