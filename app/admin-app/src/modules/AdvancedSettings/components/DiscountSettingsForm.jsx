import React from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";

export default function DiscountSettingsForm({ data, isEditing, onChange }) {
  return (
    <SectionCard title="Manual Discount Permissions & Caps" description="Establish safety constraints for cashiers regarding order/item deductions.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableNumberInput label="Max Cashier Manual Discount (%)" value={data?.maxManualDiscount} path="maxManualDiscount" isEditing={isEditing} onChange={onChange} />
        <EditableNumberInput label="Manager Approval Threshold Trigger (%)" value={data?.approvalThreshold} path="approvalThreshold" isEditing={isEditing} onChange={onChange} />
        
        <EditableSelect 
          label="Require Management Override Above Cap" 
          value={data?.requireManagerApproval ? "true" : "false"} 
          path="requireManagerApproval" 
          options={["true", "false"]} 
          isEditing={isEditing} 
          onChange={(p, val) => onChange("requireManagerApproval", val === "true")} 
        />

        <div className="p-4 bg-slate-50 rounded-xl border flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Allowed Discount Scopes</label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold">
              <input type="checkbox" disabled={!isEditing} checked={data?.allowItemDiscount ?? false} onChange={(e) => onChange("allowItemDiscount", e.target.checked)} /> Item Level
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold">
              <input type="checkbox" disabled={!isEditing} checked={data?.allowInvoiceDiscount ?? false} onChange={(e) => onChange("allowInvoiceDiscount", e.target.checked)} /> Whole Invoice
            </label>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}