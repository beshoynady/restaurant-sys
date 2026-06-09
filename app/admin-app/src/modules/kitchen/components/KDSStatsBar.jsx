import React from "react";
import { Layers, Layers3, Flame, CheckCircle2, XCircle, AlertTriangle, Package, Printer, Volume2, FileSpreadsheet } from "lucide-react";

export default function KDSStatsBar({ stats, isDark, isArabic }) {
  const cardConfigs = [
    { label: isArabic ? "إجمالي الطلبات" : "Total Orders", count: stats.total, color: "text-slate-300", bg: "bg-slate-500/10", icon: Layers },
    { label: isArabic ? "في انتظار القبول" : "Pending Approval", count: stats.pending, color: "text-amber-500", bg: "bg-amber-500/10", icon: Layers3 },
    { label: isArabic ? "جاري التنفيذ" : "In Progress", count: stats.inProgress, color: "text-blue-400", bg: "bg-blue-500/10", icon: Flame },
    { label: isArabic ? "المنتهية" : "Completed", count: stats.completed, color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
    { label: isArabic ? "المرفوضة" : "Rejected", count: stats.rejected, color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
    { label: isArabic ? "لم يتم استلامها" : "Not Collected", count: stats.notCollected, color: "text-purple-400", bg: "bg-purple-500/10", icon: AlertTriangle },
  ];

  return (
    <section className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b ${
      isDark ? "bg-[#0b1120] border-slate-800/80" : "bg-surface-secondary border-slate-200"
    }`}>
      {/* بطاقات الإحصائيات */}
      <div className="flex flex-wrap items-center gap-2">
        {cardConfigs.map((c, i) => {
          const IconComponent = c.icon;
          return (
            <div key={i} className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border ${c.bg} ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <IconComponent className={`w-4 h-4 ${c.color}`} />
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">{c.label}</p>
                <p className={`text-base font-black leading-none mt-1 ${c.color}`}>{c.count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* أزرار العمليات الإضافية المتكاملة لمساعدة الطهاة */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 border border-emerald-600/20 rounded-xl text-xs font-bold transition">
          <Package className="w-4 h-4" />
          <span>{isArabic ? "عرض المخزون والمكونات" : "Inventory & Stock"}</span>
        </button>

        <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${isDark ? "bg-[#111930] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-surface border-slate-200 text-slate-600"}`}>
          <Volume2 className="w-4 h-4 text-indigo-400" />
          <span>{isArabic ? "صوت التنبيه (تشغيل)" : "Alert Tone (ON)"}</span>
        </button>

        <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${isDark ? "bg-[#111930] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-surface border-slate-200 text-slate-600"}`}>
          <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
          <span>{isArabic ? "تقرير وجبات اليوم" : "Daily Food Report"}</span>
        </button>
      </div>
    </section>
  );
}