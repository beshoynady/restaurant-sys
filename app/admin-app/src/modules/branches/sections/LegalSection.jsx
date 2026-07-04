import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";

export default function LegalSection({ branch = {}, updateBranch }) {
  return (
    <SectionCard title="Legal">
      <EditableInput
        label="Tax ID"
        value={branch.taxIdentificationNumber || ""}
        onChange={(v) => updateBranch("taxIdentificationNumber", v)}
      />
    </SectionCard>
  );
}
