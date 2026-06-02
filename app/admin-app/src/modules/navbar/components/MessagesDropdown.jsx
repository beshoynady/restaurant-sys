// src/shared/InboxDropdown.jsx

import { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function InboxDropdown({ messages = [], onDismiss }) {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  const { t } = useTranslation("common");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}

      <button
        onClick={() => setOpen((p) => !p)}
        className="
          relative

          flex h-10 w-10
          items-center justify-center

          rounded-xl

          border border-border
          bg-surface
          text-foreground

          hover:bg-surface-secondary

          transition
        "
      >
        <Mail size={18} />

        {messages.length > 0 && (
          <span
            className="
              absolute
              -top-1
              -end-1

              flex h-5 min-w-5
              items-center justify-center

              rounded-full

              bg-danger
              text-danger-foreground

              text-[10px]
              font-bold
            "
          >
            {messages.length}
          </span>
        )}
      </button>

      {/* Dropdown */}

      {open && (
        <div
          className="
            absolute
            end-0
            mt-2

            z-50

            w-80

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
              {t("messages.title")}
            </h3>
          </div>

          {/* Messages */}

          <div className="max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("messages.empty")}
              </div>
            ) : (
              messages.map((message) => (
                <Link
                  key={message._id}
                  to="/messages"
                  className="
                    flex items-start
                    justify-between
                    gap-3

                    border-b border-border

                    p-4

                    hover:bg-surface-secondary

                    transition
                  "
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {message.name}
                    </p>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.message}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();

                      onDismiss?.(message._id);
                    }}
                    className="
                      text-danger

                      hover:opacity-80
                    "
                  >
                    <X size={16} />
                  </button>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}

          <div className="border-t border-border p-2">
            <Link
              to="/messages"
              className="
                block

                rounded-xl

                px-3 py-2

                text-center
                text-sm

                hover:bg-surface-secondary

                transition
              "
            >
              {t("messages.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
