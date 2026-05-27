import { useState } from "react";
import TopBar from "../components/TopBar";

import WelcomeStep from "../steps/WelcomeStep";
import FinishStep from "../steps/FinishStep";

export default function SetupWizard() {
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => s + 1);

  const steps = [<WelcomeStep onNext={next} />, <FinishStep />];

  return (
    <div className="bg-red-500 dark:bg-blue-900 min-h-screen">
      <TopBar />

      <div className="flex items-center justify-center p-4 md:p-8">
        <div
          className="w-full max-w-2xl rounded-3xl p-6 md:p-10
          bg-white dark:bg-gray-900
          border border-gray-200 dark:border-gray-800
          shadow-xl transition-all"
        >
          {steps[step]}
        </div>
      </div>
    </div>
  );
}
