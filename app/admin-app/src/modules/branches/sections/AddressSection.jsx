import SectionCard from "../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../shared/ui/forms/EditableInput";

export default function AddressSection({ branch = {}, updateBranch }) {
  const address = branch.address || {
    country: "",
    city: "",
    area: "",
    street: "",
  };

  return (
    <SectionCard title="Address">
      <EditableInput
        label="Country"
        value={address.country}
        onChange={(v) =>
          updateBranch("address", {
            ...address,
            country: v,
          })
        }
      />
    </SectionCard>
  );
}
