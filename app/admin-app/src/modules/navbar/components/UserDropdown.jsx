// src/shared/ui/UserDropdown.jsx

import { useEffect, useRef, useState } from "react";
import { LogOut, User, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * User menu dropdown
 *
 * Supports:
 * - Theme system
 * - i18n
 * - RTL/LTR
 * - Outside click
 */

export default function UserDropdown({
  user,
  onLogout,
  onProfile,
  onSettings,
}) {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  const { t } = useTranslation("common");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const initial =
    user?.username?.charAt(0)?.toUpperCase() || "U";

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      {/* Trigger */}

      <button
        onClick={() => setOpen((p) => !p)}
        className="
          flex h-10 w-10
          items-center justify-center

          rounded-full

          bg-primary
          text-primary-foreground

          font-semibold

          transition
          hover:opacity-90
        "
      >
        {initial}
      </button>

      {/* Menu */}

      {open && (
        <div
          className="
            absolute end-0 mt-2

            z-50

            w-64

            overflow-hidden

            rounded-2xl

            border border-border
            bg-surface

            shadow-lg
          "
        >
          {/* Header */}

          <div className="border-b border-border p-4">
            <p className="font-semibold text-foreground">
              {user?.username}
            </p>

            <p className="text-sm text-muted-foreground">
              {user?.role}
            </p>
          </div>

          {/* Profile */}

          <button
            onClick={onProfile}
            className="
              flex w-full items-center gap-3

              px-4 py-3

              text-start

              hover:bg-surface-secondary

              transition
            "
          >
            <User size={18} />

            <span>
              {t("user.profile")}
            </span>
          </button>

          {/* Settings */}

          <button
            onClick={onSettings}
            className="
              flex w-full items-center gap-3

              px-4 py-3

              text-start

              hover:bg-surface-secondary

              transition
            "
          >
            <Settings size={18} />

            <span>
              {t("user.settings")}
            </span>
          </button>

          {/* Logout */}

          <button
            onClick={onLogout}
            className="
              flex w-full items-center gap-3

              border-t border-border

              px-4 py-3

              text-start

              text-danger

              hover:bg-surface-secondary

              transition
            "
          >
            <LogOut size={18} />

            <span>
              {t("user.logout")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}