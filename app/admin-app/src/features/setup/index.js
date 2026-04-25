/* =====================================
   📁 features/setup/index.js
===================================== */

export { default as SetupPage } from "./pages/SetupPage";


/* =====================================
   📁 features/setup/pages/SetupPage.jsx
===================================== */

import { useState } from "react";
import StepIndicator from "../components/StepIndicator";
import BrandStep from "../components/BrandStep";
import OwnerStep from "../components/OwnerStep";
import BranchStep from "../components/BranchStep";
import SuccessScreen from "../components/SuccessScreen";
import { useSetup } from "../hooks/useSetup";
import { mapPayload } from "../utils/mapPayload";

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const { runSetup, loading, error } = useSetup();

  const [form, setForm] = useState({
    brand: {
      name: { EN: "", AR: "" },
      legalName: "",
      currency: "EGP",
    },
    owner: {
      username: "",
      password: "",
      email: "",
      phone: "",
    },
    branch: {
      name: { EN: "", AR: "" },
    },
  });

  const update = (path, value) => {
    setForm((prev) => {
      const copy = { ...prev };
      const keys = path.split(".");
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async (e) => {
    e.preventDefault();
    const payload = mapPayload(form);
    await runSetup(payload);
    setSuccess(true);
  };

  if (success) return <SuccessScreen />;

  return (
    <div className="p-6">
      <StepIndicator step={step} />

      {error && <div className="text-red-500">{error}</div>}

      <form onSubmit={submit}>
        {step === 1 && <BrandStep form={form} update={update} />}
        {step === 2 && <OwnerStep form={form} update={update} />}
        {step === 3 && <BranchStep form={form} update={update} />}

        <div className="flex justify-between mt-4">
          {step > 1 && <button type="button" onClick={back}>Back</button>}
          {step < 3 && <button type="button" onClick={next}>Next</button>}
          {step === 3 && (
            <button disabled={loading} type="submit">
              {loading ? "Creating..." : "Finish"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}