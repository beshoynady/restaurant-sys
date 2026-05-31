// src/layouts/dashboard/DashboardSidebar.jsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { sidebarItems } from "./config/sidebar.config";

export default function DashboardSidebar() {
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside className="lg:flex h-screen w-18 flex-col border-e bg-card">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <h2 className="font-bold text-lg">Smart Menu</h2>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;

          // SIMPLE LINK
          if (!item.children) {
            return (
              <NavLink
                key={item.title}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                    isActive ? "bg-primary text-white" : "hover:bg-accent"
                  }`
                }
              >
                {Icon && <Icon size={18} />}
                <span>{item.title}</span>
              </NavLink>
            );
          }

          // DROPDOWN MENU
          const isOpen = openMenus[item.title];

          return (
            <div key={item.title}>
              <button
                onClick={() => toggleMenu(item.title)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon size={18} />}
                  <span>{item.title}</span>
                </div>

                {isOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              {isOpen && (
                <div className="ms-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-lg text-sm transition ${
                          isActive ? "bg-primary text-white" : "hover:bg-accent"
                        }`
                      }
                    >
                      {child.title}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
