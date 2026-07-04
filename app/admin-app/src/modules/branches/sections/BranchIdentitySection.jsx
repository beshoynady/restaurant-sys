import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";
import EditableSelect from "../../../shared/ui/forms/EditableSelect";

export default function BranchIdentitySection({ branch = {}, updateBranch }) {
  const name = branch.name || { ar: "", en: "" };

  return (
    <SectionCard title="Branch Identity">
      <div className="grid grid-cols-2 gap-4">
        <EditableInput
          label="Arabic Name"
          value={name.ar}
          onChange={(v) =>
            updateBranch("name", {
              ...name,
              ar: v,
            })
          }
        />

        <EditableInput
          label="English Name"
          value={name.en}
          onChange={(v) =>
            updateBranch("name", {
              ...name,
              en: v,
            })
          }
        />
      </div>
    </SectionCard>
  );
}
