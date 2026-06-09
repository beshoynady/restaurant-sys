import Card from "../../../shared/ui/layout/SectionCard";

function StatItem({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-surface-secondary border border-border text-foreground p-4 text-center">
      <div className="text-sm text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

export default function BrandStatsCard({
  formData,
}) {
  return (
    <Card title="Quick Stats">
      <div className="grid grid-cols-2 gap-4">
        <StatItem
          title="Branches"
          value={formData.maxBranches}
        />

        <StatItem
          title="Languages"
          value={
            formData.dashboardLanguages
              .length
          }
        />

        <StatItem
          title="Currency"
          value={formData.currency}
        />

        <StatItem
          title="Status"
          value={formData.status}
        />
      </div>
    </Card>
  );
}