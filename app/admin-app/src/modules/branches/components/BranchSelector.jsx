import SectionCard from "../../../shared/ui/layout/SectionCard";

export default function BranchSelector({
  branches,
  selectedBranchId,
  setSelectedBranchId,
}) {
  return (
    <SectionCard
      title="Branch Selector"
      description="Select branch or create new one"
    >
      <div className="flex gap-2">
        <select
          className="w-full p-2 border rounded-lg"
          value={selectedBranchId || ""}
          onChange={(e) => setSelectedBranchId(e.target.value || null)}
        >
          <option value="">+ New Branch</option>

          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.isMainBranch ? "⭐ " : ""}
              {b.name?.en}
            </option>
          ))}
        </select>

        <button
          className="px-3 py-2 bg-primary text-white rounded-lg"
          onClick={() => setSelectedBranchId(null)}
        >
          New
        </button>
      </div>
    </SectionCard>
  );
}
