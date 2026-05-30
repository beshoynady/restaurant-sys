// src/context/AuthContext.js
import { createContext, useState, useEffect } from "react";
import { initializeApp } from "../app/initialization/initializeApp";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [userLoginInfo, setUserLoginInfo] = useState(null);
  const [brand, setBrand] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const initData = await initializeApp();
        setBrand(initData.brand || null);
        setIsLoading(false);
    };

    initialize();
  }
    , []);

    const logout = () => {
    setUserLoginInfo(null);
    setBrand(null);
  }

    return (
    <AuthContext.Provider
      value={{
        userLoginInfo,
        brand,
        isLoading,
        setUserLoginInfo,
        setBrand,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
