// features/auth/services/authStorage.js
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "accessToken";

/**
 * Save authentication data
 */
export const saveAuthData = (accessToken) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
};

/**
 * Get token
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get decoded user from token
 */
export const getUser = () => {
  const token = getToken();

  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded; // contains id, brand, role, branch
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
};

/**
 * Clear auth data
 */
export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
};