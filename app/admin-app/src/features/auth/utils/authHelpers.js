// features/auth/utils/authHelpers.js

/**
 * Check authentication state
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem("accessToken");
};