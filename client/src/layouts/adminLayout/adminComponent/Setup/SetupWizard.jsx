// 📁 SetupWizard.jsx
import React, { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";

import StepWelcome from "./StepWelcome";
import StepOwnerEmployment from "./StepOwnerEmployment";
import StepRestaurant from "./StepRestaurant";
import StepFinish from "./StepFinish";
import NavbarWizard from "./navbarWizard";

import { dataContext } from "../../../../context/appContext";

/**
 * SetupWizard Component
 * Handles multi-step setup wizard for first-time configuration
 * Steps: Welcome → Owner → Restaurant → Finish
 */
const SetupWizard = () => {
  const { apiUrl, config } = useContext(dataContext);

  const [step, setStep] = useState(0);

  // App-wide settings for language and theme
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("en");

  // Load saved preferences (theme + language)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const savedLang = localStorage.getItem("lang") || "en";
    setTheme(savedTheme);
    setLang(savedLang);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  // Go to next or previous step
  const nextStep = () =>
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  // Steps configuration
  const steps = [
    <StepWelcome onNext={nextStep} lang={lang} theme={theme} key="welcome" />,
    <StepOwnerEmployment
      onNext={nextStep}
      onBack={prevStep}
      lang={lang}
      theme={theme}
      apiUrl={apiUrl}
      key="employment"
    />,
    <StepRestaurant
      onNext={nextStep}
      onBack={prevStep}
      lang={lang}
      theme={theme}
      apiUrl={apiUrl}
      config={config}
      key="restaurant"
    />,
    <StepFinish lang={lang} theme={theme} key="finish" />,
  ];

  return (
    <div
      className={`w-100 vh-100 d-flex align-items-center justify-content-center flex-column position-relative ${
        theme === "dark" ? "bg-dark text-light" : "bg-light text-dark"
      }`}
      style={{ overflow: "hidden" }}
    >
      {/* 🌐 Top Navbar (visible on all steps) */}
      <NavbarWizard
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
      />

      {/* ⚙️ Animated Step Container */}
      <motion.div
        className={`container-fluid py-2 w-100 ${
          theme === "dark" ? "bg-dark text-light" : "bg-light text-dark"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          maxHeight: "calc(100vh)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          paddingTop: "70px",
        }}
      >
        <div className="w-100" style={{ maxWidth: "600px" }}>
          {steps[step]}
        </div>

        <p className="text-muted mt-2">
          Step {step + 1} of {steps.length}
        </p>
      </motion.div>
    </div>
  );
};

export default SetupWizard;
