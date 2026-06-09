import { Languages } from "lucide-react";

import Card from "../../../../shared/ui/layout/SectionCard";

import EditableSelect from "../../../../shared/ui/forms/EditableSelect";
import EditableBadgeGroup from "../../../../shared/ui/forms/EditableBadgeGroup";

import {
  DASHBOARD_LANGUAGES,
} from "../../constants/brandOptions";

export default function LanguageSection({
  formData,
  isEditing,
  handleChange,
  toggleArrayValue,
}) {
  return (
    <Card
      title="Language Settings"
      icon={<Languages size={18} />}
    >
      <div className="space-y-5">
        <EditableBadgeGroup
          label="Enabled Languages"
          values={
            formData.dashboardLanguages
          }
          options={
            DASHBOARD_LANGUAGES
          }
          isEditing={isEditing}
          onToggle={(value) =>
            toggleArrayValue(
              "dashboardLanguages",
              value
            )
          }
        />

        <EditableSelect
          label="Default Language"
          value={
            formData.defaultDashboardLanguage
          }
          path="defaultDashboardLanguage"
          options={
            DASHBOARD_LANGUAGES
          }
          isEditing={isEditing}
          onChange={handleChange}
        />
      </div>
    </Card>
  );
}