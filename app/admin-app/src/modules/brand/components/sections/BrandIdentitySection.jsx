import { Building2 } from "lucide-react";

import Card from "../../../../shared/ui/layout/SectionCard";

import EditableInput from "../../../../shared/ui/forms/EditableInput";
import EditableNumberInput from "../../../../shared/ui/forms/EditableNumberInput";
import EditableSelect from "../../../../shared/ui/forms/EditableSelect";
import EditableBadgeGroup from "../../../../shared/ui/forms/EditableBadgeGroup";
import EditableImageInput from "../../../../shared/ui/forms/EditableImageInput";

import {
  BUSINESS_TYPES,
  CUISINES,
} from "../../constants/brandOptions";

export default function BrandIdentitySection({
  formData,
  isEditing,
  handleChange,
  toggleArrayValue,
}) {
  return (
    <Card
      title="Brand Information"
      icon={<Building2 size={18} />}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <EditableInput
          label="Brand Name (English)"
          value={formData.name.EN}
          path="name.EN"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableInput
          label="Brand Name (Arabic)"
          value={formData.name.AR}
          path="name.AR"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableInput
          label="Slug"
          value={formData.slug}
          path="slug"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableSelect
          label="Business Type"
          value={formData.businessType}
          path="businessType"
          options={BUSINESS_TYPES}
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableNumberInput
          label="Max Branches"
          value={formData.maxBranches}
          path="maxBranches"
          isEditing={isEditing}
          onChange={handleChange}
          min={1}
          max={50}
        />

        <div />
      </div>

      <div className="mt-5">
        <EditableImageInput
          label="Logo"
          value={formData.logo}
          path="logo"
          isEditing={isEditing}
          onChange={handleChange}
        />
      </div>

      <div className="mt-5">
        <EditableBadgeGroup
          label="Cuisine Types"
          values={formData.cuisineType}
          options={CUISINES}
          isEditing={isEditing}
          onToggle={(value) =>
            toggleArrayValue(
              "cuisineType",
              value
            )
          }
        />
      </div>
    </Card>
  );
}