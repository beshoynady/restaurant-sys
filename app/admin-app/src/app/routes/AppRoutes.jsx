// src/app/routes/AppRoutes.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

import { initializeApp } from "../initialization/initializeApp";

// Guards
import ProtectedRoute from "../guards/ProtectedRoute";

// ================= LAYOUTS =================
const DashboardLayout = lazy(
  () => import("../../layouts/dashboard/DashboardLayout.jsx"),
);

// ================= PAGES =================
const SetupPage = lazy(() => import("../../modules/setup/pages/SetupWizard"));

const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));

const PosPage = lazy(() => import("../../modules/pos/pages/PosPage.jsx"));

const KOTPage = lazy(() => import("../../modules/kitchen/pages/KDSPage.jsx"));

const NotFound = () => <div>404</div>;

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
      <div className="min-h-screen flex items-center justify-center">
        Initializing System...
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* =========================================
            FIRST TIME SETUP
        ========================================= */}
        {!isSetupCompleted ? (
          <>
            <Route path="/setup" element={<SetupPage />} />

            {/* Redirect everything to setup */}
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            {/* =========================================
                AUTH
            ========================================= */}
            <Route path="/login" element={<LoginPage />} />

            {/* =========================================
                DASHBOARD
            ========================================= */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />

            {/* =========================================
                DEFAULT REDIRECT
            ========================================= */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* =========================================
                404
            ========================================= */}
            <Route path="*" element={<NotFound />} />
            
            <Route path="/pos" element={<PosPage />} />
            <Route path="/kot" element={<KOTPage />} />
          </>
          
        )}
      </Routes>
    </Suspense>
  );
}
