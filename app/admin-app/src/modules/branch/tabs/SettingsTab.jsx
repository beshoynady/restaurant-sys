/**
 * ==========================================
 * Branch Settings Tab
 * ------------------------------------------
 * Main container for settings module.
 * ==========================================
 */

import ContactCard from "./settings/ContactCard";
import OperatingHoursCard from "./settings/OperatingHoursCard";
import FeaturesCard from "./settings/FeaturesCard";
import ServicesCard from "./settings/ServicesCard";
import PoliciesCard from "./settings/PoliciesCard";

export default function SettingsTab({ settings }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ContactCard settings={settings} />

      <OperatingHoursCard settings={settings} />

      <FeaturesCard settings={settings} />

      <ServicesCard settings={settings} />

      <PoliciesCard settings={settings} />
    </div>
  );
}