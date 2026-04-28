import { useState, useEffect } from "react";
import { useSetupForm } from "../hooks/useSetup.js";

import TopBar from "../components/TopBar";

import WelcomeStep from "../steps/WelcomeStep.jsx";
import BrandStep from "../steps/BrandStep";
import OwnerStep from "../steps/OwnerStep";
import BranchStep from "../steps/BranchStep";
import FinishStep from "../steps/FinishStep";

import { initializeSetup } from "../api/setup.api.js";

export default function SetupWizard() {
  const [step, setStep] = useState(0);

  // 🌍 Language
  const [lang, setLang] = useState("en");

  // 🌗 Theme
  const [theme, setTheme] = useState("light");

  const { form, update } = useSetupForm();
  const [loading, setLoading] = useState(false);

  // apply theme to html
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // RTL support
  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    await initializeSetup(form);
    setLoading(false);
    setStep(4);
  };

  const steps = [
    <WelcomeStep onNext={next} lang={lang} />,
    <BrandStep data={form} update={update} onNext={next} onBack={back} lang={lang} />,
    <OwnerStep data={form} update={update} onNext={next} onBack={back} lang={lang} />,
    <BranchStep data={form} update={update} onSubmit={handleSubmit} onBack={back} loading={loading} lang={lang} />,
    <FinishStep lang={lang} />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col transition">

      <TopBar
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
      />

      {/* Stepper */}
      <div className="flex justify-center mt-6">
        <div className="flex gap-2">
          {[0,1,2,3,4].map((i) => (
            <div
              key={i}
              className={`h-2 w-10 rounded-full transition ${
                step >= i
                  ? "bg-emerald-500"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white dark:bg-gray-900 shadow-xl rounded-3xl p-8 border border-gray-100 dark:border-gray-800 transition">
          {steps[step]}
        </div>
      </div>
    </div>
  );
}