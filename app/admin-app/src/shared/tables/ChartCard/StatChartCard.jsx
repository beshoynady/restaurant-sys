import React, { useState } from "react";

export default function StatChartCard({ title, value, icon, chartType = "line", color = "indigo" }) {
  const [timeframe, setTimeframe] = useState("month");

  const colors = {
    indigo: { text: "text-indigo-600", bg: "bg-indigo-50", fill: "bg-indigo-600", border: "border-indigo-100" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50", fill: "bg-emerald-600", border: "border-emerald-100" },
    blue: { text: "text-blue-600", bg: "bg-blue-50", fill: "bg-blue-600", border: "border-blue-100" },
  };

  const theme = colors[color] || colors.indigo;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-48 transition-all hover:shadow-md">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.text}`}>
          {icon}
        </div>
      </div>

      {/* Mini Charts Engine (رسم بياني خطي، منحني، أو أعمدة) */}
      <div className="h-12 flex items-end gap-1.5 my-2 px-1">
        {chartType === "bar" ? (
          // أشرطة رشيقة مرتفعة ومنخفضة متطابقة مع الصورة
          [40, 60, 45, 90, 75, 50, 35].map((h, idx) => (
            <div key={idx} className="flex-1 bg-slate-100 rounded-t-sm h-full flex items-end">
              <div className={`w-full rounded-t-sm ${theme.fill}`} style={{ height: `${h}%` }}></div>
            </div>
          ))
        ) : (
          // محاكاة الخط المنحني الانسيابي (Line / Smooth Area Curve)
          <div className="w-full h-full relative overflow-hidden flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d="M0,25 Q15,5 30,18 T60,8 T90,20 L100,5"
                fill="none"
                stroke={color === "emerald" ? "#10b981" : "#4f46e5"}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0,25 Q15,5 30,18 T60,8 T90,20 L100,5 L100,30 L0,30 Z"
                fill={color === "emerald" ? "url(#gradient-em)" : "url(#gradient-in)"}
                opacity="0.12"
              />
              <defs>
                <linearGradient id="gradient-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5"/><stop offset="100%" stopColor="#fff"/></linearGradient>
                <linearGradient id="gradient-em" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#fff"/></linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>

      {/* Timeframe Selector Button Matrix */}
      <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 self-start">
        {["today", "yesterday", "week", "month"].map((t) => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg capitalize transition-all ${
              timeframe === t ? "bg-white text-slate-800 shadow-sm border" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}