import { useState } from "react";

const useLogin = () => {
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    try {
      setLoading(true);

      console.log("Login Data:", credentials);

      // API Request Here

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
  };
};

export default useLogin;