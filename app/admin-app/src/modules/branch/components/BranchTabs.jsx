// src/modules/branch/components/BranchTabs.jsx
/**
 * ==========================================
 * Branch Tabs
 * ------------------------------------------
 * Navigation tabs for branch module.
 * ==========================================
 */

export default function BranchTabs({ activeTab, setActiveTab }) {
  const tabs = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "settings",
      label: "Settings",
    },
    {
      id: "deliveryAreas",
      label: "Delivery Areas",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl bg-gray-100 p-2 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-5 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-surface shadow dark:bg-gray-900"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
