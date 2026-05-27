import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * useAuth
 * -------
 * Central hook to access authentication state
 * (user, token, brand, loading, etc.)
 */
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return {
    userLoginInfo: context.userLoginInfo,
    brand: context.brand,
    isLoading: context.isLoading,
    setUserLoginInfo: context.setUserLoginInfo,
    setBrand: context.setBrand,
    logout: context.logout,
  };
};

export default useAuth;