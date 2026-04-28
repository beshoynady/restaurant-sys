/* =====================================
   📁 src/routes/AppRoutes.jsx
   Professional Routing Setup (Vite + React)
===================================== */

import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// =========================
// Pages (Lazy Loaded)
// =========================
const SetupPage = lazy(() => import("../features/setup/pages/SetupWizard.jsx"));


// Placeholder (future)
const Dashboard = () => <div>Dashboard</div>;
const Login = () => <div>Login Page</div>;
const NotFound = () => <div>404 - Not Found</div>;

// =========================
// Auth Guard (temporary)
// =========================
const isAuthenticated = () => {
  // later: check token / cookie
  return true;
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// =========================
// App Routes
// =========================
export default function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* ================= Setup (Public - first run) ================= */}
        <Route path="/setup" element={<SetupPage />} />

        {/* ================= Auth ================= */}
        <Route path="/login" element={<Login />} />

        {/* ================= Protected App ================= */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= Default Redirect ================= */}
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* ================= 404 ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}