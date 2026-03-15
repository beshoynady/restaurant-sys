import React from "react";
import { motion } from "framer-motion";

/**
 * StepWelcome Component
 * First screen in the setup wizard
 * Adapts automatically to light/dark theme
 */
const StepWelcome = ({ onNext, lang, theme }) => {
  const isDark = theme === "dark";
  const isArabic = lang === "ar";

  return (
    <motion.div
      className={`text-center p-5 rounded-5 shadow-lg border transition-all duration-500 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-light border-gray-600"
          : "bg-gradient-to-br from-white via-blue-50 to-blue-100 text-dark border-gray-200"
      }`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        minHeight: "350px",
      }}
    >
      {/* Title */}
      <motion.h1
        className={`fw-bold mb-3 display-5 ${
          isDark
            ? "text-info drop-shadow-[0_0_12px_rgba(91,192,222,0.6)]"
            : "text-primary drop-shadow-[0_0_10px_rgba(0,123,255,0.4)]"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isArabic ? "🍽️ القائمة الذكية" : "🍽️ Smart Menu"}
      </motion.h1>

      {/* Description */}
      <motion.p
        className={`fs-5 mb-5 ${
          isDark ? "text-light opacity-75" : "text-muted"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {isArabic
          ? "مرحبًا بك في معالج إعداد القائمة الذكية. لنبدأ بإعداد حسابك وتفاصيل المطعم بخطوات سهلة وسريعة."
          : "Welcome to the Smart Menu setup wizard. Let’s begin settings up your account and restaurant details in easy steps."}
      </motion.p>

      {/* Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-5 py-3 rounded-pill fw-semibold shadow-lg border-0 transition-all ${
          isDark
            ? "bg-info text-dark hover:bg-cyan-400"
            : "bg-primary text-white hover:bg-blue-700"
        }`}
        onClick={onNext}
      >
        {isArabic ? "ابدأ الإعداد 🚀" : "Start Setup 🚀"}
      </motion.button>
    </motion.div>
  );
};

export   default StepWelcome;
