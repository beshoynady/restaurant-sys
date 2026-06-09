import { Clock3 } from "lucide-react";

import Card from "../../../../shared/ui/layout/SectionCard";

function AuditField({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">
        {label}
      </p>

      <div className="h-12 rounded-xl border border-border text-foreground px-4 flex items-center bg-surface-secondary">
        {value}
      </div>
    </div>
  );
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString();
}

export default function AuditSection({
  formData,
}) {
  return (
    <Card
      title="Audit Information"
      icon={<Clock3 size={18} />}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <AuditField
          label="Created At"
          value={formatDate(
            formData.createdAt
          )}
        />

        <AuditField
          label="Updated At"
          value={formatDate(
            formData.updatedAt
          )}
        />
      </div>
    </Card>
  );
}