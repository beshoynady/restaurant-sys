import axios from "axios";

// =====================================
// Create Axios Instance
// Centralized API handler for the app
// =====================================
const api = axios.create({
  // Base URL for all API requests
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",

  // Allow cookies (important for refresh token & session auth)
  withCredentials: true,

  // Default headers for all requests
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================
// Request Interceptor
// Runs before every request is sent
// =====================================
api.interceptors.request.use(
  (config) => {
    // Future use: attach JWT token automatically
    // Example:
    // const token = localStorage.getItem("token");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================
// Response Interceptor
// Handles global API response errors
// =====================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Future implementation:
        // Call refresh token endpoint to get new access token
        // await api.post("/auth/refresh");

        // Retry original request after refresh
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails → user should be logged out
        console.error("Session expired. Please login again.");
      }
    }

    return Promise.reject(error);
  }
);

// Export configured axios instance
export default api;