// features/auth/hooks/useLogin.js

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { loginRequest } from "../api/authApi";
import { saveAuthData } from "../services/authStorage";
import { setCredentials } from "../store/authSlice";

export const useLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  /**
   * Handle login process
   */
  const login = async (values) => {
    try {
      setLoading(true);

      const data = await loginRequest(values);

      saveAuthData({
        token: data.token,
        user: data.user,
      });

      dispatch(
        setCredentials({
          token: data.token,
          user: data.user,
        })
      );

      toast.success("Login successful");

      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
  };
};