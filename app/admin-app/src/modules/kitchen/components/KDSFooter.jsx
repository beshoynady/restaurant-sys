import React from "react";
import { Sliders, RefreshCw, PrinterCheck, LifeBuoy } from "lucide-react";

export default function KDSFooter({ isDark, isArabic }) {
  return (
    <footer className={`px-4 py-3 flex flex-wrap items-center justify-between gap-4 border-t ${
      isDark ? "bg-[#0c1324] border-slate-800" : "bg-surface border-slate-200"
    }`}>
      {/* روابط النظام التقنية للوحة المطبخ */}
      <div className="flex items-center gap-2">
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${isDark ? "bg-[#111930] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-surface border-slate-200 text-slate-600"}`}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-indigo-400" />
          <span>{isArabic ? "تحديث البيانات فوري" : "Sync Data Now"}</span>
        </button>
        
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${isDark ? "bg-[#111930] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-surface border-slate-200 text-slate-600"}`}>
          <PrinterCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isArabic ? "إعادة طباعة ملصقات الباركود" : "Reprint Labels"}</span>
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
        <span>{isArabic ? "اتصال الشبكة: مستقر 100٪" : "Network Status: Connected"}</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
      </div>

      <div className="flex items-center gap-2">
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${isDark ? "bg-[#111930] border-slate-800 text-slate-300" : "bg-surface border-slate-200"}`}>
          <Sliders className="w-3.5 h-3.5" />
          <span>{isArabic ? "إعدادات العرض" : "Layout Configurations"}</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 rounded-xl text-xs font-bold transition">
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>{isArabic ? "طلب الدعم الفني" : "SOS Support"}</span>
        </button>
      </div>
    </footer>
  );
}