import SectionCard from "../../../shared/ui/layout/SectionCard";

export default function StatusSection({
  branch,
  updateBranch,
}) {
  return (
    <SectionCard title="Status">

      <div className="space-y-3">

        <label className="flex justify-between">
          Main Branch

          <input
            type="checkbox"
            checked={branch.isMainBranch}
            onChange={(e) =>
              updateBranch(
                "isMainBranch",
                e.target.checked
              )
            }
          />
        </label>

      </div>

    </SectionCard>
  );
}