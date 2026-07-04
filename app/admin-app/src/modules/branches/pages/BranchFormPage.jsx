import useBranchForm from "../hooks/useBranchForm";

import BranchSelector from "../components/BranchSelector";

import BranchIdentitySection from "../sections/BranchIdentitySection";
import AddressSection from "../sections/AddressSection";
import LegalSection from "../sections/LegalSection";

import ContactSection from "../sections/settings/ContactSection";
import PhoneSection from "../sections/settings/PhoneSection";
import PoliciesSection from "../sections/settings/PoliciesSection";
import FeaturesSection from "../sections/settings/FeaturesSection";
import OperatingHoursSection from "../sections/settings/OperatingHoursSection";

import SectionCard from "../../../shared/ui/layout/SectionCard";

export default function BranchFormPage() {
  const {
    branch,
    settings,
    selectedBranchId,
    setSelectedBranchId,
    updateBranch,
    updateSettings,
    save,
  } = useBranchForm();

  const mockBranches = [
    {
      _id: "1",
      name: { en: "Main Branch" },
      isMainBranch: true,
    },
    {
      _id: "2",
      name: { en: "Smouha Branch" },
    },
  ];

  return (
    <div className="space-y-6">
      <BranchSelector
        branches={mockBranches}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
      />

      {/* Branch Core */}
      <BranchIdentitySection branch={branch} updateBranch={updateBranch} />

      <AddressSection branch={branch} updateBranch={updateBranch} />

      <LegalSection branch={branch} updateBranch={updateBranch} />

      {/* Settings */}
      <ContactSection settings={settings} updateSettings={updateSettings} />

      <PhoneSection settings={settings} updateSettings={updateSettings} />

      <PoliciesSection settings={settings} updateSettings={updateSettings} />

      <FeaturesSection settings={settings} updateSettings={updateSettings} />

      <OperatingHoursSection
        settings={settings}
        updateSettings={updateSettings}
      />

      <SectionCard>
        <button
          onClick={save}
          className="w-full bg-primary text-white p-3 rounded-xl"
        >
          Save Branch
        </button>
      </SectionCard>
    </div>
  );
}
