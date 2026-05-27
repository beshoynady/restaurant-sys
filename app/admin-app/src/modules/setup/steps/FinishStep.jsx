import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function FinishStep() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="text-center space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-center">
        <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle
            size={50}
            className="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t("completed")}
      </h2>

      <p className="text-gray-500 dark:text-gray-400">
        {t("completedDescription")}
      </p>

      <button
        className="
        px-6 py-3 rounded-xl
        bg-emerald-600 hover:bg-emerald-700
        text-white transition
      "
      >
        {t("dashboard")}
      </button>
    </motion.div>
  );
}