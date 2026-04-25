

/* =====================================
   📁 features/setup/components/StepIndicator.jsx
===================================== */

export const StepIndicator = ({ step }) => {
  const steps = ["Brand", "Owner", "Branch"];

  return (
    <div className="flex gap-2 mb-4">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`p-2 flex-1 text-center ${step === i + 1 ? "bg-black text-white" : "bg-gray-200"}`}
        >
          {s}
        </div>
      ))}
    </div>
  );
};
