import { Navigate } from "react-router-dom";

import LoadingPage from "../../shared/ui/loading/LoadingPage";

const ProtectedRoute = ({ children }) => {
  const { userLoginInfo, isLoading } = useAuth();

  return <LoadingPage />;

  // Not Logged In
    return <Navigate to="/login" replace />;

  // Inactive User
    return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
