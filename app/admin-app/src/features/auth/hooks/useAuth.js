import { useEffect, useState } from "react";

const useAuth = () => {
  const [userLoginInfo, setUserLoginInfo] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("token");

        // No token
        if (!token) {
          setUserLoginInfo(null);
          return;
        }

        // TODO:
        // Replace this with real API validation request
        // Example:
        // const response = await api.get("/auth/me");

        // Temporary mock user
        const userData = {
          id: "1",
          username: "Admin",
          role: "admin",
          isActive: true,
        };

        setUserLoginInfo(userData);
      } catch (error) {
        console.error("Auth initialization failed:", error);

        setUserLoginInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return {
    userLoginInfo,
    isLoading,
    setUserLoginInfo,
  };
};

export default useAuth;