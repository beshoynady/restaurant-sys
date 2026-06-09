import { BadgeDollarSign } from "lucide-react";

import Card from "../../../../shared/ui/layout/SectionCard";

import EditableSelect from "../../../../shared/ui/forms/EditableSelect";
import EditableNumberInput from "../../../../shared/ui/forms/EditableNumberInput";

import {
  CURRENCIES,
} from "../../constants/brandOptions";

export default function FinancialSection({
  formData,
  isEditing,
  handleChange,
}) {
  return (
    <Card
      title="Financial Settings"
      icon={
        <BadgeDollarSign size={18} />
      }
    >
      <div className="grid md:grid-cols-2 gap-5">
        <EditableSelect
          label="Currency"
          value={formData.currency}
          path="currency"
          options={CURRENCIES}
          isEditing={isEditing}
          onChange={handleChange}
        />

        <EditableNumberInput
          label="Decimal Places"
          value={formData.decimalPlaces}
          path="decimalPlaces"
          isEditing={isEditing}
          onChange={handleChange}
          min={0}
          max={4}
        />
      </div>
    </Card>
  );
}