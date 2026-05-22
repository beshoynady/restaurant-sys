import { Navigate } from "react-router-dom";

import LoadingPage from "../../shared/ui/loading/LoadingPage";

import useAuth from "../../features/auth/hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { userLoginInfo, isLoading } = useAuth();

  // Loading State
  if (isLoading) {
    return <LoadingPage />;
  }

  // Not Logged In
  if (!userLoginInfo) {
    return <Navigate to="/login" replace />;
  }

  // Inactive User
  if (!userLoginInfo?.isActive) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;