// src/layouts/dashboard/DashboardLayout.jsx
import { Outlet } from "react-router-dom";

import DashboardSidebar from "./DashboardSidebar";
import DashboardTopBar from "./DashboardTopBar";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
