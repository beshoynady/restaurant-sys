import { Globe } from "lucide-react";

import Card from "../../../../shared/ui/layout/SectionCard";

import EditableInput from "../../../../shared/ui/forms/EditableInput";
import EditableSelect from "../../../../shared/ui/forms/EditableSelect";

import {
  SETUP_STATUS,
  BRAND_STATUS,
} from "../../constants/brandOptions";

export default function OperationalSection({
  formData,
  isEditing,
  handleChange,
}) {
  return (
    <Card
      title="Operational Settings"
      icon={<Globe size={18} />}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <EditableInput
          label="Country Code"
          value={formData.countryCode}
          path="countryCode"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableInput
          label="Timezone"
          value={formData.timezone}
          path="timezone"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableSelect
          label="Setup Status"
          value={formData.setupStatus}
          path="setupStatus"
          options={SETUP_STATUS}
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableSelect
          label="Brand Status"
          value={formData.status}
          path="status"
          options={BRAND_STATUS}
          isEditing={isEditing}
          onChange={handleChange}
        />
      </div>
    </Card>
  );
}