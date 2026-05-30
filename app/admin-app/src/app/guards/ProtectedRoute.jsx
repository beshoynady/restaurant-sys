// src/app/guards/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";

import LoadingPage from "../../shared/ui/loading/LoadingPage";
import useAuth from "../../shared/hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { userLoginInfo, isLoading } = useAuth();

  // Loading
  if (isLoading) {
    return <LoadingPage />;
  }

  // Not logged in
  if (!userLoginInfo) {
    return <Navigate to="/login" replace />;
  }

  // User inactive example
  // if (userLoginInfo.status !== "active") {
  //   return <Navigate to="/login" replace />;
  // }

  return children;
};

export default ProtectedRoute;