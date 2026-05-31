// src/shared/ui/NotificationDropdown.jsx
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  const notifications = [
    {
      id: 1,
      title: "New Order Received",
      description: "Order #1054 has been created.",
      time: "2 min ago",
    },
    {
      id: 2,
      title: "Low Stock Alert",
      description: "Chicken Breast is running low.",
      time: "10 min ago",
    },
    {
      id: 3,
      title: "Employee Leave Request",
      description: "Ahmed submitted a leave request.",
      time: "1 hour ago",
    },
  ];

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="
          relative
          flex h-10 w-10 items-center justify-center
          rounded-xl
          border border-border
          bg-card
          transition
          hover:bg-accent
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
              bg-red-500
              px-1
              text-[10px]
              font-bold
              text-white
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
            absolute end-0 mt-2
            z-50
            w-80
            overflow-hidden
            rounded-2xl
            border border-border
            bg-card
            shadow-xl
          "
        >
          {/* Header */}
          <div className="border-b border-border p-4">
            <h3 className="font-semibold">Notifications</h3>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  className="
                    flex w-full flex-col
                    items-start
                    gap-1
                    border-b border-border
                    p-4
                    text-start
                    transition
                    hover:bg-accent
                  "
                >
                  <span className="font-medium">{item.title}</span>

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
              className="
                w-full rounded-xl
                px-3 py-2
                text-sm font-medium
                transition
                hover:bg-accent
              "
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
