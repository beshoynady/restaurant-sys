// src/layouts/dashboard/components/DashboardUserMenu.jsx
import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";

export default function DashboardUserMenu() {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

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
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  const user = {
    fullName: "Admin User",
    email: "admin@example.com",
    role: "Administrator",
  };

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      {/* Trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="
          flex items-center gap-3
          rounded-xl
          border border-border
          bg-card
          px-3 py-2
          transition
          hover:bg-accent
        "
      >
        {/* Avatar */}
        <div
          className="
            flex h-9 w-9 items-center
            justify-center
            rounded-full
            bg-primary
            text-sm
            font-semibold
            text-primary-foreground
          "
        >
          AU
        </div>

        <div className="hidden text-start md:block">
          <p className="text-sm font-medium">
            {user.fullName}
          </p>

          <p className="text-xs text-muted-foreground">
            {user.role}
          </p>
        </div>

        <ChevronDown size={16} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute end-0 mt-2
            w-72
            overflow-hidden
            rounded-2xl
            border border-border
            bg-card
            shadow-xl
            z-50
          "
        >
          {/* User Info */}
          <div className="border-b border-border p-4">
            <h4 className="font-medium">
              {user.fullName}
            </h4>

            <p className="mt-1 text-sm text-muted-foreground">
              {user.email}
            </p>

            <span
              className="
                mt-3 inline-flex
                rounded-full
                bg-primary/10
                px-2 py-1
                text-xs
                font-medium
                text-primary
              "
            >
              {user.role}
            </span>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              className="
                flex w-full items-center gap-3
                rounded-xl
                px-3 py-2
                text-sm
                hover:bg-accent
              "
            >
              <User size={18} />
              My Profile
            </button>

            <button
              className="
                flex w-full items-center gap-3
                rounded-xl
                px-3 py-2
                text-sm
                hover:bg-accent
              "
            >
              <Settings size={18} />
              Account Settings
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <button
              className="
                flex w-full items-center gap-3
                rounded-xl
                px-3 py-2
                text-sm
                text-red-500
                hover:bg-red-500/10
              "
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}