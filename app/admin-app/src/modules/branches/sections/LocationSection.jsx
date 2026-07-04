import SectionCard from "../../../shared/ui/layout/SectionCard";
import { EditableNumberInput } from "../../../shared/ui/forms";

export default function LocationSection({
  branch,
  updateBranch,
}) {
  const coords = branch.location.coordinates;

  const updateCoord = (index, value) => {
    const updated = [...coords];
    updated[index] = value;

    updateBranch("location", {
      ...branch.location,
      coordinates: updated,
    });
  };

  return (
    <SectionCard title="Location">

      <div className="grid grid-cols-2 gap-4">

        <EditableNumberInput
          label="Longitude"
          value={coords?.[0] || 0}
          onChange={(v) => updateCoord(0, v)}
        />

        <EditableNumberInput
          label="Latitude"
          value={coords?.[1] || 0}
          onChange={(v) => updateCoord(1, v)}
        />

      </div>

    </SectionCard>
  );
}