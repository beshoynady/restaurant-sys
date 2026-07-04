import React from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";

export default function ServiceChargeForm({ data, isEditing, onChange }) {
  return (
    <SectionCard title="Service Charge Configuration" description="Manage subtotal service markup rules and rounding thresholds.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl flex items-center justify-between border">
          <span className="text-sm font-bold text-slate-800">Activate Service Charge</span>
          <input type="checkbox" disabled={!isEditing} checked={data?.enabled ?? false} onChange={(e) => onChange("enabled", e.target.checked)} className="w-5 h-5 accent-blue-600" />
        </div>

        <EditableSelect label="Charge Calculation Framework" value={data?.type} path="type" options={["PERCENTAGE", "FIXED"]} isEditing={isEditing} onChange={onChange} />
        <EditableNumberInput label="Rate / Absolute Value" value={data?.value} path="value" isEditing={isEditing} onChange={onChange} />
        <EditableSelect label="Calculation Base Relative to Tax" value={data?.calculationBase} path="calculationBase" options={["BEFORE_TAX", "AFTER_TAX"]} isEditing={isEditing} onChange={onChange} />
        <EditableSelect label="Mathematical Rounding Mode" value={data?.roundingMode} path="roundingMode" options={["UP", "DOWN", "NEAREST"]} isEditing={isEditing} onChange={onChange} />
      </div>
    </SectionCard>
  );
}