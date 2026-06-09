// src/shared/ui/StepActions.jsx

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StepActions({
  onBack,
  onNext,
  nextLabel,
  backLabel,
  loading = false,
  hideBack = false,
}) {
  const { i18n, t } = useTranslation();

  const isArabic = i18n.language === "ar";

  return (
    <div className="flex items-center justify-between gap-4 pt-8">

      {/* BACK BUTTON */}

      {!hideBack ? (
        <button
          type="button"
          onClick={onBack}
          className="
            group
            inline-flex
            items-center
            gap-2
            px-5
            py-3
            rounded-2xl
            border
            border-slate-300
            dark:border-slate-700
            bg-surface/70
            dark:bg-slate-800/70
            hover:bg-slate-100
            dark:hover:bg-slate-700
            text-slate-700
            dark:text-slate-200
            transition-all
            duration-200
            font-medium
            shadow-sm
            hover:shadow-md
          "
        >
          <ArrowLeft
            size={18}
            className="
              transition-transform
              group-hover:-translate-x-1
            "
          />

          {backLabel || t("back")}
        </button>
      ) : (
        <div />
      )}

      {/* NEXT BUTTON */}

      <button
        type="button"
        disabled={loading}
        onClick={onNext}
        className="
          group
          inline-flex
          items-center
          gap-2
          px-6
          py-3
          rounded-2xl
          bg-gradient-to-r
          from-emerald-500
          via-emerald-600
          to-teal-600
          hover:from-emerald-600
          hover:via-emerald-700
          hover:to-teal-700
          text-white
          font-semibold
          shadow-lg
          hover:shadow-emerald-500/30
          transition-all
          duration-300
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />

            {t("loading")}
          </>
        ) : (
          <>
            {nextLabel || t("next")}

            <ArrowRight
              size={18}
              className="
                transition-transform
                group-hover:translate-x-1
              "
            />
          </>
        )}
      </button>
    </div>
  );
}