import SectionCard from "../../../../shared/ui/layout/SectionCard";
import EditableInput from "../../../../shared/ui/forms/EditableInput";

export default function ContactSection({
  settings,
  updateSettings,
}) {
  const contact = settings.contact;

  const updateContact = (field, value) => {
    updateSettings("contact", {
      ...contact,
      [field]: value,
    });
  };

  return (
    <SectionCard title="Contact Information">

      <div className="grid grid-cols-2 gap-4">

        <EditableInput
          label="WhatsApp"
          value={contact.whatsapp}
          onChange={(v) =>
            updateContact("whatsapp", v)
          }
        />

        <EditableInput
          label="Email"
          value={contact.email}
          onChange={(v) =>
            updateContact("email", v)
          }
        />

      </div>

    </SectionCard>
  );
}