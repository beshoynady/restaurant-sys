import React from "react";
import { Utensils, Moon, Sun, Languages } from "lucide-react";

export default function KDSNavbar({
  activeSection,
  setActiveSection,
  toggleTheme,
  toggleLanguage,
  isDark,
  isArabic,
  lang,
}) {
  const sections = [
    { id: "all", labelAr: "الكل (محدد)", labelEn: "All Sections" },
    { id: "kitchen_main", labelAr: "المطبخ الرئيسي", labelEn: "Main Kitchen" },
    { id: "kitchen_sub", labelAr: "المطبخ الفرعي", labelEn: "Sub Kitchen" },
    { id: "bar_eastern", labelAr: "البار الشرقي", labelEn: "Eastern Bar" },
    { id: "bar_western", labelAr: "البار الغربي", labelEn: "Western Bar" },
  ];

  return (
    <nav
      className={`px-4 py-3 flex flex-wrap items-center justify-between gap-4 border-b transition-colors ${
        isDark ? "bg-[#0c1324] border-slate-800" : "bg-surface border-slate-200"
      }`}
    >
      {/* اسم وشعار المطعم */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
          <Utensils className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-black text-lg tracking-wide bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {isArabic ? "مطعم الذواقة الفاخر" : "Gourmet Elite KDS"}
          </h1>
          <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            {isArabic ? "نظام شاشات التحضير الفوري" : "Live Kitchen Node"}
          </p>
        </div>
      </div>

      {/* أزرار التنقل بين المطبخ والبار - أزرار كبيرة سهلة للمس باليد */}
      <div
        className={`flex items-center gap-1.5 p-1 rounded-xl border ${isDark ? "bg-[#111930] border-slate-800" : "bg-slate-100 border-slate-200"}`}
      >
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === sec.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-105"
                : isDark
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  : "text-slate-600 hover:bg-surface"
            }`}
          >
            {isArabic ? sec.labelAr : sec.labelEn}
          </button>
        ))}
      </div>

      {/* التوقيت وأدوات تغيير اللغة والثيم */}
      <div className="flex items-center gap-3">
        <div
          className={`text-end hidden lg:block text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}
        >
          <div>
            {isArabic ? "الاثنين، 25 مايو 2026" : "Monday, May 25, 2026"}
          </div>
          <div className="text-indigo-400 font-mono mt-0.5">12:45:12 PM</div>
        </div>

        <div className="flex items-center gap-1.5 border-s ps-3 border-slate-700">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition ${isDark ? "bg-[#111930] border-slate-800 hover:bg-slate-800 text-amber-400" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}
            title="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={toggleLanguage}
            className={`p-2 rounded-xl border flex items-center gap-1 font-bold text-xs transition ${isDark ? "bg-[#111930] border-slate-800 hover:bg-slate-800 text-cyan-400" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}
          >
            <Languages className="w-4 h-4" />
            <span className="uppercase">{lang}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
