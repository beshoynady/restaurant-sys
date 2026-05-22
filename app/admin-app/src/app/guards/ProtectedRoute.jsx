import { Navigate } from "react-router-dom";
import LoadingPage from "../shared/components/loading/LoadingPage";
import { useAuth } from "../features/auth/hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { userLoginInfo, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }
  
  if (!userLoginInfo) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed =
    userLoginInfo?.isActive;

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;