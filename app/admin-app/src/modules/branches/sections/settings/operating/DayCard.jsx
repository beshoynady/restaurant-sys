import PeriodCard from "./PeriodCard";

export default function DayCard({ data, onChange }) {
  const update = (field, value) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const addPeriod = () => {
    update("periods", [
      ...(data.periods || []),
      {
        name: "",
        openTime: "",
        closeTime: "",
        services: {
          dineIn: { enabled: true },
          takeaway: { enabled: true },
          delivery: { enabled: true },
        },
        pauses: [],
      },
    ]);
  };

  const updatePeriod = (index, newPeriod) => {
    const updated = [...(data.periods || [])];
    updated[index] = newPeriod;

    update("periods", updated);
  };

  return (
    <div className="border rounded-xl p-4">

      {/* Header */}
      <div className="flex justify-between items-center mb-3">

        <strong>{data.day}</strong>

        <select
          value={data.status}
          onChange={(e) =>
            update("status", e.target.value)
          }
        >
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="holiday">Holiday</option>
        </select>

      </div>

      {/* Periods */}
      <div className="space-y-3">

        {(data.periods || []).map(
          (p, i) => (
            <PeriodCard
              key={i}
              data={p}
              onChange={(val) =>
                updatePeriod(i, val)
              }
            />
          )
        )}

      </div>

      <button
        className="text-primary text-sm mt-3"
        onClick={addPeriod}
      >
        + Add Period
      </button>

    </div>
  );
}