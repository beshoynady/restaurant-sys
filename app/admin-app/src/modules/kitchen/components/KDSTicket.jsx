import React, { useState } from "react";
import { Clock, User, Check, X, AlertCircle } from "lucide-react";

export default function KDSTicket({ order, isDark, isArabic, onAccept, onReject, onFinish }) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState("");

  // تحديد مستوى التنبيه اللوني بناءً على وقت التحضير المستغرق حتى الآن
  const getTimerColor = (mins) => {
    if (mins > 20) return "bg-red-500/20 text-red-500 border-red-500/30 animate-pulse";
    if (mins > 10) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  const submitRejection = () => {
    if (reason.trim() === "") return;
    onReject(order.id, reason);
    setShowRejectInput(false);
  };

  return (
    <div className={`rounded-xl border-2 flex flex-col justify-between gap-3 p-3.5 shadow-md transition-all duration-200 relative ${
      order.status === 'rejected' ? 'border-red-900/50 opacity-75' : 
      order.status === 'completed' ? 'border-emerald-900/50 opacity-75' :
      isDark ? "bg-[#111827] border-slate-800" : "bg-surface border-slate-200"
    }`}>
      
      {/* ترويسة التذكرة ومعلومات الوقت والمستغرق */}
      <div className="flex items-center justify-between border-b border-dashed border-slate-700/60 pb-2">
        <div>
          <span className="font-black text-base text-white tracking-wide bg-slate-800 px-2 py-0.5 rounded-md">{order.id}</span>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            <span>{isArabic ? `طلب: ${order.orderTime}` : `Ordered: ${order.orderTime}`}</span>
          </div>
        </div>
        
        {/* عداد المدة المستغرقة حالياً في المطبخ */}
        <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getTimerColor(order.initialMinutes)}`}>
          {order.initialMinutes} {isArabic ? "دقائق" : "mins"}
        </div>
      </div>

      {/* تفاصيل نوع التذكرة والمسؤول عنها الصادرة من الكاشير/الويتر */}
      <div className={`grid grid-cols-2 text-[11px] p-2 rounded-lg ${isDark ? "bg-slate-900/60" : "bg-surface-secondary"}`}>
        <div>
          <span className="text-slate-400 block font-medium">{isArabic ? "النوع" : "Type"}</span>
          <span className="font-bold text-indigo-400">{isArabic ? order.type : order.typeEn}</span>
        </div>
        <div className="text-end">
          <span className="text-slate-400 block font-medium">{isArabic ? "المسؤول" : "Staff"}</span>
          <span className="font-bold text-slate-200 flex items-center justify-end gap-0.5">
            <User className="w-3 h-3 inline" /> {isArabic ? order.creator : order.creatorEn}
          </span>
        </div>
      </div>

      {/* توقيت بدء التنفيذ (يظهر إذا تم القبول وجاري العمل عليه) */}
      {order.startTime && order.status !== "pending" && (
        <div className="text-[10px] text-cyan-400 font-semibold px-1">
          {isArabic ? `⏱️ بدأ التنفيذ: ${order.startTime}` : `⏱️ Started: ${order.startTime}`}
        </div>
      )}

      {/* لستة الوجبات المطلوبة مع إبراز الأعداد بشكل ضخم للمطبخ وعرض الملاحظات والإضافات لكل صنف */}
      <div className="flex flex-col gap-2 my-1 flex-1">
        {order.items?.map((item, idx) => (
          <div key={idx} className={`p-2 rounded-lg border border-transparent ${isDark ? "bg-slate-800/40" : "bg-slate-100"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-bold text-slate-100">
                {isArabic ? item.nameAr : item.nameEn}
              </div>
              {/* إبراز العدد بخلفية واضحة للرؤية السريعة من مسافة بعيدة */}
              <span className="bg-indigo-600 text-white font-black text-xs px-2 py-0.5 rounded-md min-w-[24px] text-center">
                [{item.qty}]
              </span>
            </div>
            {/* الإضافات الخاصة بكل وجبة */}
            {item.extras && (
              <div className="text-[10px] text-amber-400 font-medium mt-1">
                ➕ {isArabic ? "إضافات:" : "Extras:"} {item.extras}
              </div>
            )}
            {/* الملاحظات الفريدة لكل وجبة */}
            {item.notes && (
              <div className="text-[10px] text-cyan-400 font-medium mt-0.5 bg-cyan-950/20 px-1 py-0.5 rounded">
                📝 {isArabic ? "ملاحظة:" : "Note:"} {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* أزرار التحكم والتفاعل حسب حالة التذكرة حالياً */}
      {order.status === "pending" && !showRejectInput && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button 
            onClick={() => onAccept(order.id)} 
            className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-600/10"
          >
            <Check className="w-3.5 h-3.5" /> {isArabic ? "قبول" : "Accept"}
          </button>
          <button 
            onClick={() => setShowRejectInput(true)} 
            className="py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-red-600/20"
          >
            <X className="w-3.5 h-3.5" /> {isArabic ? "رفض" : "Reject"}
          </button>
        </div>
      )}

      {/* حقل إدخال سبب الرفض فور النقر عليه */}
      {showRejectInput && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isArabic ? "اكتب سبب الرفض هنا..." : "Enter rejection reason..."}
            className="w-full p-1.5 bg-slate-900 border border-red-500/40 rounded-lg text-xs text-slate-200 outline-none focus:border-red-500 resize-none h-12"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={submitRejection} className="py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold">
              {isArabic ? "تأكيد الرفض" : "Confirm"}
            </button>
            <button onClick={() => setShowRejectInput(false)} className="py-1 bg-slate-800 text-slate-400 rounded-lg text-[11px]">
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* زر الإنهاء عند البدء الفعلي في العمل بالوجبة */}
      {order.status === "in_progress" && (
        <button 
          onClick={() => onFinish(order.id)} 
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-md"
        >
          <Check className="w-4 h-4" /> {isArabic ? "إنهاء وإرسال للاستلام" : "Finish & Dispatch"}
        </button>
      )}

      {/* ملصق توضيحي للطلبات المنتهية تاريخياً ومستلمة */}
      {order.status === "completed" && (
        <div className="w-full py-1.5 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-xl text-xs font-bold text-center">
          ✓ {isArabic ? "تم الانتهاء والتقديم" : "Completed & Served"}
        </div>
      )}

      {/* عرض سبب الرفض داخل الكارت للأرشيف */}
      {order.status === "rejected" && (
        <div className="p-2 bg-red-600/10 border border-red-600/20 rounded-xl text-[11px] text-red-400">
          <span className="font-bold flex items-center gap-0.5 mb-0.5"><AlertCircle className="w-3 h-3" /> {isArabic ? "سبب الرفض:" : "Reason:"}</span>
          {order.rejectionReason}
        </div>
      )}

      {/* ملصق التنبيه للطلبات التي لم يتم استلامها بعد طهيها وتجهيزها */}
      {order.status === "not_collected" && (
        <div className="w-full py-1.5 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-xl text-xs font-bold text-center animate-pulse">
          ⚠️ {isArabic ? "جاهز وبانتظار الاستلام" : "Ready for Pickup"}
        </div>
      )}

    </div>
  );
}