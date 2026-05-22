// =====================================
// 📁 ProgressBar.jsx
// =====================================
import { motion } from "framer-motion";

export default function ProgressBar({ step, total }) {
  return (
    <div className="px-6 pt-4">
      <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
          animate={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}