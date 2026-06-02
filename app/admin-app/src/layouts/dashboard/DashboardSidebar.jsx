// src/layouts/dashboard/DashboardSidebar.jsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { sidebarItems } from "./config/sidebar.config";

export default function DashboardSidebar() {
  const [openMenus, setOpenMenus] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMenu = (title) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && <h2 className="font-bold text-lg">Smart Menu</h2>}

        {/* Toggle collapse (desktop only) */}
        <button
          className="hidden md:flex"
          onClick={() => setCollapsed((p) => !p)}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>

        {/* Mobile close */}
        <button className="md:hidden" onClick={() => setMobileOpen(false)}>
          <X size={18} />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            return (
              <NavLink
                key={item.title}
                to={item.path}
                className={({ isActive }) =>
                  `
                  flex items-center gap-3
                  px-3 py-2 rounded-xl
                  transition

                  ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-surface-secondary"
                  }
                `
                }
              >
                {Icon && <Icon size={18} />}

                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            );
          }

          const isOpen = openMenus[item.title];

          return (
            <div key={item.title}>
              <button
                onClick={() => toggleMenu(item.title)}
                className="
                  w-full flex items-center justify-between
                  px-3 py-2 rounded-xl
                  hover:bg-surface-secondary
                "
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon size={18} />}

                  {!collapsed && <span>{item.title}</span>}
                </div>

                {!collapsed &&
                  (isOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {isOpen && !collapsed && (
                <div className="ms-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `
                          block px-3 py-2 rounded-lg text-sm
                          ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-surface-secondary"
                          }
                        `
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
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="md:hidden p-2 m-2" onClick={() => setMobileOpen(true)}>
        <Menu />
      </button>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex
          h-screen
          flex-col

          border-e border-border
          bg-surface

          transition-all duration-300

          ${collapsed ? "w-20" : "w-72"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />

          <div className="w-72 bg-surface border-e border-border">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
