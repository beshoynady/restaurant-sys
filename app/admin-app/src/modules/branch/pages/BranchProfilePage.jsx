/**
 * ==========================================
 * Branch Profile Page
 * ------------------------------------------
 * Main page for branch management.
 * Contains:
 * - Branch Selector
 * - Branch Header
 * - Tabs Navigation
 * ==========================================
 */

import { useState } from "react";

import BranchSelector from "../components/BranchSelector";
import BranchHeader from "../components/BranchHeader";
import BranchTabs from "../components/BranchTabs";

import OverviewTab from "../tabs/OverviewTab";
import SettingsTab from "../tabs/SettingsTab";
import DeliveryAreasTab from "../tabs/DeliveryAreasTab";

export default function BranchProfilePage() {
  const [activeTab, setActiveTab] = useState("overview");

  const [selectedBranch, setSelectedBranch] = useState({
    id: "1",
    name: {
      en: "Main Branch",
      ar: "الفرع الرئيسي",
    },
    slug: "main-branch",
    status: "active",
    isMainBranch: true,
  });

  return (
    <div className="space-y-6">
      <BranchSelector
        selectedBranch={selectedBranch}
        onChange={setSelectedBranch}
      />

      <BranchHeader branch={selectedBranch} />

      <BranchTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {activeTab === "overview" && (
        <OverviewTab branch={selectedBranch} />
      )}

      {activeTab === "settings" && (
        <SettingsTab branch={selectedBranch} />
      )}

      {activeTab === "deliveryAreas" && (
        <DeliveryAreasTab branch={selectedBranch} />
      )}
    </div>
  );
}