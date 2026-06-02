import { useTranslation } from "react-i18next";

import UserDropdown from "./UserDropdown";
import NotificationDropdown from "./NotificationDropdown";
import FullscreenButton from "./FullscreenButton";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Dashboard Top Navigation Bar
 *
 * Features:
 * - Fullscreen Toggle
 * - Language Switcher
 * - Theme Toggle
 * - Notifications
 * - User Menu
 */

export default function NavBar() {
  const { t } = useTranslation();

  const notifications = [
    {
      id: 1,
      title: t("notifications.newOrder"),
      description: "#1054",
      time: "2 min",
    },
    {
      id: 2,
      title: t("notifications.lowStock"),
      description: "Chicken Breast",
      time: "10 min",
    },
  ];

  const currentUser = {
    username: "Beshoy",
    role: "Administrator",
  };

  return (
    <header
      className="
        sticky top-0 z-40

        flex items-center justify-between

        h-16

        border-b border-border

        bg-surface

        px-4 md:px-6
      "
    >
      {/* Left Side */}

      <div className="flex items-center gap-3">
        <h1
          className="
            text-lg
            font-semibold
            text-foreground
          "
        >
          {t("dashboard.title")}
        </h1>
      </div>

      {/* Right Side */}

      <div className="flex items-center gap-2">
        <FullscreenButton />

        <LanguageSwitcher />

        <ThemeToggle />

        <NotificationDropdown
          notifications={notifications}
        />

        <UserDropdown
          user={currentUser}
          onProfile={() => {}}
          onSettings={() => {}}
          onLogout={() => {}}
        />
      </div>
    </header>
  );
}