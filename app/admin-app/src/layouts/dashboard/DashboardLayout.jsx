// src/layouts/dashboard/DashboardLayout.jsx

import { Outlet } from "react-router-dom";

import DashboardSidebar from "./DashboardSidebar";
import DashboardTopBar from "./DashboardTopBar";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TopBar */}
        <DashboardTopBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
