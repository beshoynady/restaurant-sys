import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

import { initializeApp } from "../initialization/initializeApp";

// Guards
import ProtectedRoute from "../guards/ProtectedRoute";

// Layouts
// const DashboardLayout = lazy(() =>
//   import("../../layouts/dashboard/DashboardLayout")
// );

// const POSLayout = lazy(() =>
//   import("../../layouts/pos/POSLayout")
// );

// const KitchenLayout = lazy(() =>
//   import("../../layouts/kitchen/KitchenLayout")
// );

// Modules
const SetupPage = lazy(() =>
  import("../../modules/setup/pages/SetupWizard")
);

const Login = lazy(() =>
  import("../../features/login/pages/LoginPage")
);

// Pages
const DashboardHome = () => <div>Dashboard Home</div>;
const NotFound = () => <div>404</div>;

export default function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await initializeApp();
        setIsSetupCompleted(data?.isSetupCompleted);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return <div>Initializing App...</div>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>

        {/* ================= SETUP ================= */}
        {!isSetupCompleted && (
          <>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        )}

        {/* ================= APP ================= */}
        {isSetupCompleted && (
          <>
            {/* LOGIN */}
            <Route path="/login" element={<Login />} />

            {/* DASHBOARD */}
            {/* <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
            </Route> */}

            {/* POS */}
            {/* <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <POSLayout />
                </ProtectedRoute>
              }
            /> */}

            {/* KITCHEN */}
            {/* <Route
              path="/kitchen"
              element={
                <ProtectedRoute>
                  <KitchenLayout />
                </ProtectedRoute>
              }
            /> */}

            {/* REDIRECT */}
            <Route path="/home" element={<Navigate to="/" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}