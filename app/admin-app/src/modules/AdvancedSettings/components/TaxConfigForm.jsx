import React from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";

export default function TaxConfigForm({ data, isEditing, onChange }) {
  return (
    <SectionCard title="Tax Configuration & VAT" description="Configure local branch financial tax matrices and reporting codes.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl flex items-center justify-between border">
          <div>
            <p className="text-sm font-bold text-slate-800">Enable Tax Calculation</p>
            <p className="text-xs text-slate-500">Toggle whether tax rates apply to check calculations.</p>
          </div>
          <input type="checkbox" disabled={!isEditing} checked={data?.enabled ?? false} onChange={(e) => onChange("enabled", e.target.checked)} className="w-5 h-5 accent-blue-600 cursor-pointer" />
        </div>

        <EditableInput label="Tax Label Name" value={data?.taxName} path="taxName" isEditing={isEditing} onChange={onChange} />
        <EditableInput label="Tax Registration Legal Number" value={data?.taxNumber} path="taxNumber" isEditing={isEditing} onChange={onChange} />
        <EditableNumberInput label="Tax Percentage Rate (%)" value={data?.percentage} path="percentage" isEditing={isEditing} onChange={onChange} />
        
        <EditableSelect 
          label="Calculation Strategy" 
          value={data?.calculationMethod} 
          path="calculationMethod" 
          options={["BEFORE_DISCOUNT", "AFTER_DISCOUNT"]} 
          isEditing={isEditing} 
          onChange={onChange} 
        />
        
        <EditableSelect 
          label="Pricing Tax Behavior" 
          value={data?.pricesIncludeTax ? "true" : "false"} 
          path="pricesIncludeTax" 
          options={["true", "false"]} 
          isEditing={isEditing} 
          onChange={(p, val) => onChange("pricesIncludeTax", val === "true")} 
        />

        <EditableSelect 
          label="Filing Frequency" 
          value={data?.taxFilingFrequency} 
          path="taxFilingFrequency" 
          options={["monthly", "quarterly", "annually"]} 
          isEditing={isEditing} 
          onChange={onChange} 
        />
      </div>
    </SectionCard>
  );
}