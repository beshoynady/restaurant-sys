export default function PeriodCard({
  data,
  onChange,
}) {
  const update = (field, value) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const updateService = (service, field, value) => {
    onChange({
      ...data,
      services: {
        ...data.services,
        [service]: {
          ...data.services?.[service],
          [field]: value,
        },
      },
    });
  };

  const toggleService = (service) => {
    updateService(
      service,
      "enabled",
      !data.services?.[service]?.enabled
    );
  };

  return (
    <div className="border p-3 rounded-lg space-y-3">

      {/* Name + Time */}
      <input
        placeholder="Period Name"
        value={data.name}
        onChange={(e) =>
          update("name", e.target.value)
        }
        className="w-full border p-2 rounded"
      />

      <div className="grid grid-cols-2 gap-2">

        <input
          type="time"
          value={data.openTime}
          onChange={(e) =>
            update("openTime", e.target.value)
          }
        />

        <input
          type="time"
          value={data.closeTime}
          onChange={(e) =>
            update("closeTime", e.target.value)
          }
        />

      </div>

      {/* Services */}
      <div className="space-y-2">

        <ServiceToggle
          label="Dine In"
          enabled={
            data.services?.dineIn?.enabled
          }
          onToggle={() =>
            toggleService("dineIn")
          }
        />

        <ServiceToggle
          label="Takeaway"
          enabled={
            data.services?.takeaway?.enabled
          }
          onToggle={() =>
            toggleService("takeaway")
          }
        />

        <ServiceToggle
          label="Delivery"
          enabled={
            data.services?.delivery?.enabled
          }
          onToggle={() =>
            toggleService("delivery")
          }
        />

      </div>

    </div>
  );
}

function ServiceToggle({
  label,
  enabled,
  onToggle,
}) {
  return (
    <label className="flex justify-between">
      <span>{label}</span>

      <input
        type="checkbox"
        checked={enabled}
        onChange={onToggle}
      />
    </label>
  );
}