// features/auth/api/authApi.js

// import axiosInstance from "../../../shared/api/axiosInstance";

/**
 * Login request
 */
// export const loginRequest = async (payload) => {
//   const response = await axiosInstance.post("/auth/login", payload);
//   console.log("Login response:", response.data);
//   return response.data;
// };



import axios from "../../../api/axios.js";

/**
 * Login request
 */
export const loginRequest = async (payload) => {
  console.log("Sending login request with payload:", payload);
  const response = await axios.post("/auth/login", payload);
  console.log("axios Login response:", response);
  return response.data;
};
