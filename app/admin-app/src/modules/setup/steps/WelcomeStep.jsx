import { useTranslation } from "react-i18next";

export default function WelcomeStep({ onNext }) {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        {t("welcome")}
      </h1>

      <p className="text-gray-500 dark:text-gray-400">
        {t("setupDescription")}
      </p>

      <button
        onClick={onNext}
        className="
        w-full py-3 rounded-xl
        bg-emerald-600 hover:bg-emerald-700
        text-white font-medium
        transition
      "
      >
        {t("startSetup")}
      </button>
    </div>
  );
}