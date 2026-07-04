import React from "react";
import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";
import EditableNumberInput from "../../../shared/ui/forms/EditableNumberInput";

export default function BranchCoreForm({ data, isEditing, onChange }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Branch Profile Identity" description="Manage localized names, status, and corporate identifiers.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableInput label="Name (English) *" value={data.name.en} path="name.en" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Name (Arabic) *" value={data.name.ar} path="name.ar" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Unique URL Slug *" value={data.slug} path="slug" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Branch Internal Code" value={data.code} path="code" isEditing={isEditing} onChange={onChange} />
          <EditableSelect 
            label="Branch Status *" 
            value={data.status} 
            path="status" 
            options={["active", "inactive", "under_maintenance"]} 
            isEditing={isEditing} 
            onChange={onChange} 
          />
          <EditableInput label="Tax Identification Number" value={data.taxIdentificationNumber} path="taxIdentificationNumber" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Commercial Register Number" value={data.commercialRegisterNumber} path="commercialRegisterNumber" isEditing={isEditing} onChange={onChange} />
        </div>
      </SectionCard>

      <SectionCard title="Address & Geo-Location (2dsphere)" description="Physical building parameters and GPS tracking indicators.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableInput label="City (Arabic)" value={data.address.city.ar} path="address.city.ar" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Area / District (Arabic)" value={data.address.area.ar} path="address.area.ar" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Street Details" value={data.address.street.ar} path="address.street.ar" isEditing={isEditing} onChange={onChange} />
          <EditableInput label="Postal Code" value={data.postalCode} path="postalCode" isEditing={isEditing} onChange={onChange} />
          
          <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <EditableNumberInput label="GPS Longitude" value={data.location.coordinates[0]} path="location.coordinates.0" isEditing={isEditing} onChange={(p, val) => onChange("location.coordinates", [val, data.location.coordinates[1]])} />
            <EditableNumberInput label="GPS Latitude" value={data.location.coordinates[1]} path="location.coordinates.1" isEditing={isEditing} onChange={(p, val) => onChange("location.coordinates", [data.location.coordinates[0], val])} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}