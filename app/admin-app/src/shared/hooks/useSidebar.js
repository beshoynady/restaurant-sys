// src/shared/hooks/useSidebar.js
import { useState } from "react";

export default function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const toggleMobile = () => setMobileOpen((prev) => !prev);

  const closeMobile = () => setMobileOpen(false);

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  };
}
