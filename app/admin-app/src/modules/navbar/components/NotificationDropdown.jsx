// src/shared/ui/NotificationDropdown.jsx
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Notification Dropdown
 * Fully integrated with:
 * - Theme system (semantic tokens only)
 * - i18n support
 * - Reusable UI system
 * - Outside click handling
 */

export default function NotificationDropdown({
  notifications = [],
  onViewAll,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { t } = useTranslation("common");

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="
          relative
          flex h-10 w-10 items-center justify-center

          rounded-xl

          border border-border
          bg-surface
          text-foreground

          hover:bg-surface-secondary

          transition
        "
      >
        <Bell size={18} />

        {/* Badge */}
        {notifications.length > 0 && (
          <span
            className="
              absolute -end-1 -top-1

              flex h-5 min-w-5 items-center justify-center

              rounded-full

              bg-danger
              text-danger-foreground

              px-1
              text-[10px]
              font-bold
            "
          >
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute end-0 mt-2 z-50 w-80

            overflow-hidden

            rounded-2xl

            border border-border
            bg-surface

            shadow-lg
          "
        >
          {/* Header */}
          <div className="border-b border-border p-4">
            <h3 className="font-semibold text-foreground">
              {t("notifications.title")}
            </h3>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  className="
                    flex w-full flex-col gap-1
                    border-b border-border
                    p-4 text-start

                    hover:bg-surface-secondary

                    transition
                  "
                >
                  <span className="font-medium text-foreground">
                    {item.title}
                  </span>

                  <span className="text-sm text-muted-foreground">
                    {item.description}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <button
              onClick={onViewAll}
              className="
                w-full rounded-xl

                px-3 py-2

                text-sm font-medium

                text-foreground

                hover:bg-surface-secondary

                transition
              "
            >
              {t("notifications.viewAll")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
