import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useTheme from "../../../shared/hooks/useTheme";
import useLanguage from "../../../shared/hooks/useLanguage";

import KDSNavbar from "../components/KDSNavbar";
import KDSStatsBar from "../components/KDSStatsBar";
import KDSTicket from "../components/KDSTicket";
import KDSFooter from "../components/KDSFooter";

const INITIAL_ORDERS = [
  {
    id: "#1087",
    type: "صالة",
    typeEn: "Dine-In",
    orderTime: "12:42 PM",
    startTime: "12:45 PM",
    initialMinutes: 14,
    creator: "ويتر: أحمد",
    creatorEn: "Waiter: Ahmed",
    section: "kitchen_main",
    status: "pending",
    items: [
      { nameAr: "بيتزا مارغريتا", nameEn: "Margherita Pizza", qty: 1, extras: "جبنة إضافية", notes: "عجينة رفيعة جداً" },
      { nameAr: "عصير برتقال", nameEn: "Orange Juice", qty: 2, extras: "نعناع طازج", notes: "بدون سكر" }
    ]
  },
  {
    id: "#1088",
    type: "تيك آواي",
    typeEn: "Takeaway",
    orderTime: "12:35 PM",
    startTime: "12:38 PM",
    initialMinutes: 22, // ستظهر باللون الأحمر لأنها تخطت الوقت المثالي
    creator: "كاشير: سارة",
    creatorEn: "Cashier: Sara",
    section: "bar_eastern",
    status: "in_progress",
    items: [
      { nameAr: "موهيتو بالليمون", nameEn: "Lemon Mojito", qty: 3, extras: "ثلج زيادة", notes: "سكر دايت" },
      { nameAr: "قهوة اسبريسو", nameEn: "Espresso", qty: 1, extras: "", notes: "دبل شوت" }
    ]
  },
  {
    id: "#1089",
    type: "توصيل",
    typeEn: "Delivery",
    orderTime: "12:10 PM",
    startTime: "12:15 PM",
    initialMinutes: 40,
    creator: "كاشير: محمد",
    creatorEn: "Cashier: Mohamed",
    section: "kitchen_sub",
    status: "completed",
    items: [
      { nameAr: "برجر دبل تشيز", nameEn: "Double Cheese Burger", qty: 2, extras: "هالبينو", notes: "بدون مايونيز" }
    ]
  },
  {
    id: "#1090",
    type: "صالة",
    typeEn: "Dine-In",
    orderTime: "11:55 AM",
    startTime: "11:58 AM",
    initialMinutes: 55,
    creator: "ويتر: ليلى",
    creatorEn: "Waiter: Layla",
    section: "bar_western",
    status: "rejected",
    rejectionReason: "الزبون ألغى الطلب بسبب التأخير"
  },
  {
    id: "#1091",
    type: "تيك آواي",
    typeEn: "Takeaway",
    orderTime: "11:40 AM",
    startTime: "11:42 AM",
    initialMinutes: 70,
    creator: "كاشير: سارة",
    creatorEn: "Cashier: Sara",
    section: "kitchen_main",
    status: "not_collected",
    items: [
      { nameAr: "باستا ألفريدو دجاج", nameEn: "Chicken Alfredo Pasta", qty: 1, extras: "مشروم", notes: "صوص زيادة" }
    ]
  }
];

export default function KDSPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLanguage } = useLanguage();
  const { i18n } = useTranslation();

  const isDark = theme === "dark";
  const isArabic = i18n.language === "ar";

  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [activeSection, setActiveSection] = useState("all");

  // محاكاة عداد الوقت التصاعدي للمطبخ (إضافة دقيقة كل دقيقة)
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.status === "in_progress" || order.status === "pending"
            ? { ...order, initialMinutes: order.initialMinutes + 1 }
            : order
        )
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // دوال التحكم بالطلبات
  const handleAccept = (id) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "in_progress", startTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } : o));
  };

  const handleReject = (id, reason) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "rejected", rejectionReason: reason } : o));
  };

  const handleFinish = (id) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "completed" } : o));
  };

  // تصفية الطلبات حسب القسم النشط في الناف بار
  const filteredOrders = activeSection === "all" 
    ? orders 
    : orders.filter(o => o.section === activeSection);

  // حساب الإحصائيات الفورية
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    inProgress: orders.filter(o => o.status === "in_progress").length,
    completed: orders.filter(o => o.status === "completed").length,
    rejected: orders.filter(o => o.status === "rejected").length,
    notCollected: orders.filter(o => o.status === "not_collected").length,
  };

  return (
    <div 
      dir={isArabic ? "rtl" : "ltr"}
      className={`min-h-screen flex flex-col font-sans select-none overflow-hidden ${
        isDark ? "bg-[#090d1a] text-slate-100" : "bg-surface-secondary text-foreground"
      }`}
    >
      {/* 1. الشريط العلوي للتحكم والأقسام */}
      <KDSNavbar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        toggleTheme={toggleTheme}
        toggleLanguage={toggleLanguage}
        isDark={isDark}
        isArabic={isArabic}
        lang={lang}
      />

      {/* 2. شريط العدادات الرقمية والعمليات المساعدة */}
      <KDSStatsBar stats={stats} isDark={isDark} isArabic={isArabic} />

      {/* 3. حاوية شبكة التذاكر (Grid Workspace) */}
      <main className="flex-1 p-4 overflow-x-auto overflow-y-hidden flex gap-4 items-start items-stretch">
        {/* عمود بانتظار القبول */}
        <div className={`flex flex-col min-w-[320px] max-w-[360px] flex-1 rounded-2xl border ${isDark ? "bg-[#0c1324]/50 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex justify-between items-center rounded-t-2xl">
            <span className="font-bold text-sm text-amber-500">{isArabic ? "📥 بانتظار القبول" : "📥 Pending Approval"}</span>
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{stats.pending}</span>
          </div>
          <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-3">
            {filteredOrders.filter(o => o.status === "pending").map(order => (
              <KDSTicket key={order.id} order={order} isDark={isDark} isArabic={isArabic} onAccept={handleAccept} onReject={handleReject} onFinish={handleFinish} />
            ))}
          </div>
        </div>

        {/* عمود جاري التنفيذ */}
        <div className={`flex flex-col min-w-[320px] max-w-[360px] flex-1 rounded-2xl border ${isDark ? "bg-[#0c1324]/50 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
          <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 flex justify-between items-center rounded-t-2xl">
            <span className="font-bold text-sm text-blue-400">{isArabic ? "🔥 جاري التنفيذ" : "🔥 In Progress"}</span>
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{stats.inProgress}</span>
          </div>
          <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-3">
            {filteredOrders.filter(o => o.status === "in_progress").map(order => (
              <KDSTicket key={order.id} order={order} isDark={isDark} isArabic={isArabic} onAccept={handleAccept} onReject={handleReject} onFinish={handleFinish} />
            ))}
          </div>
        </div>

        {/* عمود لم يتم استلامها */}
        <div className={`flex flex-col min-w-[320px] max-w-[360px] flex-1 rounded-2xl border ${isDark ? "bg-[#0c1324]/50 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
          <div className="p-3 bg-purple-500/10 border-b border-purple-500/20 flex justify-between items-center rounded-t-2xl">
            <span className="font-bold text-sm text-purple-400">{isArabic ? "⏰ لم يتم استلامها" : "⏰ Uncollected"}</span>
            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{stats.notCollected}</span>
          </div>
          <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-3">
            {filteredOrders.filter(o => o.status === "not_collected").map(order => (
              <KDSTicket key={order.id} order={order} isDark={isDark} isArabic={isArabic} onAccept={handleAccept} onReject={handleReject} onFinish={handleFinish} />
            ))}
          </div>
        </div>

        {/* عمود المنتهية والمرفوضة مجمعين لتوفير المساحة */}
        <div className={`flex flex-col min-w-[320px] max-w-[360px] flex-1 rounded-2xl border ${isDark ? "bg-[#0c1324]/50 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
          <div className="p-3 bg-slate-500/10 border-b border-slate-500/20 flex justify-between items-center rounded-t-2xl">
            <span className="font-bold text-sm text-slate-400">{isArabic ? "📜 أرشيف الوردية اليومية" : "📜 Daily Logs Archive"}</span>
            <span className="bg-slate-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{stats.completed + stats.rejected}</span>
          </div>
          <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-3">
            {filteredOrders.filter(o => o.status === "completed" || o.status === "rejected").map(order => (
              <KDSTicket key={order.id} order={order} isDark={isDark} isArabic={isArabic} onAccept={handleAccept} onReject={handleReject} onFinish={handleFinish} />
            ))}
          </div>
        </div>
      </main>

      {/* 4. شريط النظام والفوتر الإضافي */}
      <KDSFooter isDark={isDark} isArabic={isArabic} />
    </div>
  );
}