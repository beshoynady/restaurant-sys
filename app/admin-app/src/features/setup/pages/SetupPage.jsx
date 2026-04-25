import { useState } from "react";

import { StepIndicator } from "../components/StepIndicator";
import { BrandStep } from "../components/BrandStep";
import { OwnerStep } from "../components/OwnerStep";
import { BranchStep } from "../components/BranchStep";
import { SuccessScreen } from "../components/SuccessScreen";

import { useSetup } from "../hooks/useSetup";
import { mapPayload } from "../utils/mapPayload";
import { validateSetup } from "../utils/validateSetup";

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

  // =========================
  // Update nested state safely
  // =========================
  const update = (path, value) => {
    setForm((prev) => {
      const copy = structuredClone(prev);
      const keys = path.split(".");

      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }

      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  // =========================
  // Navigation
  // =========================
  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // =========================
  // Submit Setup
  // =========================
  const submit = async (e) => {
    e.preventDefault();

    const validationError = validateSetup(form);
    if (validationError) {
      alert(validationError);
      return;
    }

    const payload = mapPayload(form);

    try {
      await runSetup(payload);
      setSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // Success Screen
  // =========================
  if (success) {
    return <SuccessScreen />;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      {/* Progress */}
      <StepIndicator step={step} />

      {/* Error */}
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      <form onSubmit={submit}>
        {/* STEP 1 - BRAND */}
        {step === 1 && (
          <BrandStep form={form} update={update} />
        )}

        {/* STEP 2 - OWNER */}
        {step === 2 && (
          <OwnerStep form={form} update={update} />
        )}

        {/* STEP 3 - BRANCH */}
        {step === 3 && (
          <BranchStep form={form} update={update} />
        )}

        {/* NAVIGATION */}
        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          {step > 1 && (
            <button type="button" onClick={back}>
              Back
            </button>
          )}

          {step < 3 && (
            <button type="button" onClick={next}>
              Next
            </button>
          )}

          {step === 3 && (
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Finish Setup"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}