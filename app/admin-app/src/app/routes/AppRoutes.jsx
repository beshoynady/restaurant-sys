// src/app/routes/AppRoutes.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

import { initializeApp } from "../initialization/initializeApp";

// Guards
import ProtectedRoute from "../guards/ProtectedRoute";

// Shared
import LoadingPage from "../../shared/ui/loading/LoadingPage.jsx";

// Brand
// import BrandProfilePage from "../../modules/brand/pages/BrandProfilePage.jsx";
import BrandProfilePage from "../../modules/brand/pages/BrandPage.jsx";

import BranchProfilePage from "../../modules/branch/pages/BranchProfilePage.jsx";

// ================= LAYOUTS =================
const DashboardLayout = lazy(
  () => import("../../layouts/dashboard/DashboardLayout.jsx"),
);

// ================= PAGES =================
const SetupPage = lazy(() => import("../../modules/setup/pages/SetupWizard"));

const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));

const PosPage = lazy(() => import("../../modules/pos/pages/PosPage.jsx"));

const KOTPage = lazy(() => import("../../modules/kitchen/pages/KDSPage.jsx"));

const EmployeesPage = lazy(
  () => import("../../modules/employees/pages/EmployeesPage.jsx"),
);

const NotFound = () => (
  <div className="flex h-screen items-center justify-center text-2xl font-bold">
    404 - Page Not Found
  </div>
);

export default function AppRoutes() {
  const [loading, setLoading] = useState(true);

  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await initializeApp();

        console.log("Initialization Result:", data);

        setIsSetupCompleted(data?.isSetupCompleted || false);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingPage />
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        {/* =====================================
            FIRST TIME SETUP
        ===================================== */}
        {!isSetupCompleted ? (
          <>
            <Route path="/setup" element={<SetupPage />} />

            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            {/* =====================================
                AUTH
            ===================================== */}
            <Route path="/login" element={<LoginPage />} />

            {/* =====================================
                DASHBOARD
            ===================================== */}
            <Route
              path="/admin"
              element={
                // <ProtectedRoute>
                <DashboardLayout />
                // </ProtectedRoute>
              }
            >
              {/* Dashboard Home */}
              <Route index element={<Navigate to="brand" replace />} />

              {/* Brand */}
              <Route path="brand" element={<BrandProfilePage />} />
              <Route path="branches" element={<BranchProfilePage />} />

              {/* Employees */}
              <Route path="employees" element={<EmployeesPage />} />
            </Route>

            {/* =====================================
                POS
            ===================================== */}
            <Route path="/pos" element={<PosPage />} />

            {/* =====================================
                KDS
            ===================================== */}
            <Route path="/kot" element={<KOTPage />} />

            {/* =====================================
                DEFAULT REDIRECT
            ===================================== */}
            <Route path="/" element={<Navigate to="/admin" replace />} />

            {/* =====================================
                404
            ===================================== */}
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}
