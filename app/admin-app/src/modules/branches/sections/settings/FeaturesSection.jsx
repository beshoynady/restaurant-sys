import SectionCard from "../../../../shared/ui/layout/SectionCard";

export default function FeaturesSection({ settings, updateSettings }) {
  const features = settings.features;

  const toggleFeature = (index) => {
    const updated = [...features];
    updated[index].enabled = !updated[index].enabled;

    updateSettings("features", updated);
  };

  const updateFeature = (index, field, value) => {
    const updated = [...features];
    updated[index][field] = value;

    updateSettings("features", updated);
  };

  const addFeature = () => {
    updateSettings("features", [
      ...features,
      {
        name: "WiFi",
        enabled: true,
        description: "",
      },
    ]);
  };

  return (
    <SectionCard title="Features">
      <div className="space-y-4">
        {features.map((f, i) => (
          <div key={i} className="border p-3 rounded-lg">
            <div className="flex justify-between">
              <strong>{f.name}</strong>

              <input
                type="checkbox"
                checked={f.enabled}
                onChange={() => toggleFeature(i)}
              />
            </div>

            <input
              className="w-full mt-2 border p-1 rounded"
              placeholder="Description"
              value={f.description}
              onChange={(e) => updateFeature(i, "description", e.target.value)}
            />
          </div>
        ))}

        <button onClick={addFeature} className="text-primary text-sm">
          + Add Feature
        </button>
      </div>
    </SectionCard>
  );
}
