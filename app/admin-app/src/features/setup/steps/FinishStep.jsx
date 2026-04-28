import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function FinishStep({ lang }) {
  const isArabic = lang === "ar";

  return (
    <motion.div
      className="text-center space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Icon */}
      <div className="flex justify-center">
        <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle
            size={50}
            className="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold">
        {isArabic ? "تم الإعداد بنجاح 🎉" : "Setup Completed 🎉"}
      </h2>

      {/* Description */}
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        {isArabic
          ? "تم إنشاء الحساب والمطعم بنجاح. يمكنك الآن البدء في إدارة نظامك بكل سهولة."
          : "Your account and restaurant have been created successfully. You can now start managing your system."}
      </p>

      {/* CTA Button */}
      <button
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 transition text-white rounded-xl"
        onClick={() => {
          // 🔥 هنا هتعمل redirect للدashboard
          window.location.href = "/dashboard";
        }}
      >
        {isArabic ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard"}
      </button>
    </motion.div>
  );
}