// src/layouts/dashboard/DashboardTopBar.jsx
import LanguageToggle from "../../shared/components/language/LanguageToggle";
import ThemeToggle from "../../shared/components/theme/ThemeToggle";

import FullscreenButton from "../../shared/ui/FullscreenButton";
import NotificationDropdown from "../../shared/ui/NotificationDropdown";

import DashboardUserMenu from "./components/DashboardUserMenu";

export default function DashboardTopBar() {
  return (
    <header className="flex h-16 items-center border-b bg-card px-4 lg:px-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="ms-auto flex items-center gap-2">
        <NotificationDropdown />

        <LanguageToggle />

        <ThemeToggle />

        <FullscreenButton />

        <DashboardUserMenu />
      </div>
    </header>
  );
}
