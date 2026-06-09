import { FileText } from "lucide-react";

import Card from "../../../../shared/ui/layout/SectionCard";

import EditableInput from "../../../../shared/ui/forms/EditableInput";

export default function LegalSection({
  formData,
  isEditing,
  handleChange,
}) {
  return (
    <Card
      title="Legal Information"
      icon={<FileText size={18} />}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <EditableInput
          label="Legal Name"
          value={formData.legalName}
          path="legalName"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableInput
          label="Company Register"
          value={formData.companyRegister}
          path="companyRegister"
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableInput
          label="Tax Number"
          value={formData.taxIdNumber}
          path="taxIdNumber"
          isEditing={isEditing}
          onChange={handleChange}
        />
      </div>
    </Card>
  );
}