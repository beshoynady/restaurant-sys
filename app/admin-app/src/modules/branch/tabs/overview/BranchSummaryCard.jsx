export default function BranchSummaryCard() {
  return (
    <div className="card">
      <h2 className="title">Summary</h2>

      <div className="mt-4 space-y-3 text-sm">
        <Row label="Brand" value="Pizza Hut" />
        <Row label="Country" value="Egypt" />
        <Row label="City" value="Cairo" />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}