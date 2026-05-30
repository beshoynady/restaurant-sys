// src/modules/setup/pages/SetupWizard.jsx

import { useState } from "react";

import TopBar from "../components/TopBar";
import ProgressBar from "../components/ProgressBar";

import WelcomeStep from "../steps/WelcomeStep";
import BrandStep from "../steps/BrandStep";
import BranchStep from "../steps/BranchStep";
import OwnerStep from "../steps/OwnerStep";
import FinishStep from "../steps/FinishStep";

import { useSetupForm } from "../hooks/useSetup";

import useSetupSubmit from "../hooks/useSetupSubmit";

export default function SetupWizard() {
  // ================= FORM =================
  const { form, update, reset } = useSetupForm();

  // ================= STEP =================
  const [step, setStep] = useState(0);

  // ================= SUBMIT HOOK =================
  const { submitSetup, isSubmitting } = useSetupSubmit({
    onSuccess: () => {
      next();
    },
  });

  // ================= NAVIGATION =================
  const next = () => {
    setStep((prev) => prev + 1);
  };

  const back = () => {
    setStep((prev) => prev - 1);
  };

  // ================= FINAL SUBMIT =================
  const handleSubmit = async () => {
    try {
      console.log("🚀 FINAL SETUP PAYLOAD:", form);

      await submitSetup(form);
    } catch (error) {
      console.error(error);
    }
  };

  // ================= STEPS =================
  const steps = [
    <WelcomeStep onNext={next} />,

    <BrandStep data={form} update={update} onNext={next} onBack={back} />,

    <BranchStep data={form} update={update} onNext={next} onBack={back} />,

    <OwnerStep
      data={form}
      update={update}
      onSubmit={handleSubmit}
      onBack={back}
      isSubmitting={isSubmitting}
    />,

    <FinishStep />,
  ];

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-slate-100
        to-slate-200
        dark:from-slate-950
        dark:to-slate-900
      "
    >
      {/* TOP BAR */}
      <TopBar />

      {/* PROGRESS BAR */}
      <ProgressBar step={step} total={steps.length} />

      {/* CONTENT */}
      <div className="flex items-center justify-center p-4 md:p-8">
        <div
          className="
            w-full
            max-w-3xl
            rounded-3xl
            p-6
            md:p-10
            bg-white
            dark:bg-slate-900
            border
            border-slate-200
            dark:border-slate-800
            shadow-2xl
            transition-all
          "
        >
          {/* ACTIVE STEP */}
          {steps[step]}

          {/* GLOBAL SUBMIT LOADING */}
          {isSubmitting && (
            <div
              className="
                mt-6
                text-center
                text-sm
                text-slate-500
                dark:text-slate-400
              "
            >
              Creating system...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
