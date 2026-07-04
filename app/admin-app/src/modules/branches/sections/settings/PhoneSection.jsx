import SectionCard from "../../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../../shared/ui/forms/EditableInput";

export default function PhoneSection({ settings, updateSettings }) {
  const phones = settings.contact.phone;

  const updatePhone = (index, field, value) => {
    const updated = [...phones];
    updated[index][field] = value;

    updateSettings("contact", {
      ...settings.contact,
      phone: updated,
    });
  };

  const addPhone = () => {
    updateSettings("contact", {
      ...settings.contact,
      phone: [...phones, { label: "", number: "" }],
    });
  };

  const removePhone = (index) => {
    const updated = phones.filter((_, i) => i !== index);

    updateSettings("contact", {
      ...settings.contact,
      phone: updated,
    });
  };

  return (
    <SectionCard title="Phone Numbers">
      <div className="space-y-4">
        {phones.map((p, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <EditableInput
              label="Label"
              value={p.label}
              onChange={(v) => updatePhone(i, "label", v)}
            />

            <EditableInput
              label="Number"
              value={p.number}
              onChange={(v) => updatePhone(i, "number", v)}
            />

            <button
              onClick={() => removePhone(i)}
              className="text-red-500 text-sm col-span-2 text-left"
            >
              Remove
            </button>
          </div>
        ))}

        <button onClick={addPhone} className="text-primary text-sm">
          + Add Phone
        </button>
      </div>
    </SectionCard>
  );
}
