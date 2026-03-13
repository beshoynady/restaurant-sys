import React from "react";
import { motion } from "framer-motion";

const StepFinish = ({ lang, theme }) => {

  const isDark = theme === "dark";
  const isArabic = lang === "ar";
  return (
    <motion.div
      className={`text-center p-5 rounded shadow-sm ${isDark ? "bg-dark text-light" : "bg-white text-dark"}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-success fw-bold mb-3">{isArabic ? "تم الانتهاء من الإعداد 🎉" : "Setup Completed 🎉"}</h3>
      <p className="text-muted mb-4">
        {isArabic
          ? "تم إعداد حساب المطعم والمدير بنجاح. يمكنك البدء في استخدام Smart Menu."
          : "Your restaurant and admin account are now ready. You can start using Smart Menu."}
      </p>
      <button className="btn btn-primary px-5 py-2 rounded-pill">
        {isArabic ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard"}
      </button>
    </motion.div>
  );
};

export   default StepFinish;
