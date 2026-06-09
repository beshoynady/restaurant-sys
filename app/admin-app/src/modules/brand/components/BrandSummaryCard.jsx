import Card from "../../../shared/ui/layout/SectionCard";

function SummaryItem({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>
    </div>
  );
}

export default function BrandSummaryCard({
  formData,
}) {
  return (
    <Card title="Brand Summary">
      <div className="space-y-4">
        <SummaryItem
          label="Country"
          value={formData.countryCode}
        />

        <SummaryItem
          label="Currency"
          value={formData.currency}
        />

        <SummaryItem
          label="Language"
          value={
            formData.defaultDashboardLanguage
          }
        />

        <SummaryItem
          label="Timezone"
          value={formData.timezone}
        />

        <SummaryItem
          label="Status"
          value={formData.status}
        />
      </div>
    </Card>
  );
}