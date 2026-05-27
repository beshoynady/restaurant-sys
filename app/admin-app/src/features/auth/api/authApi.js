import axios from "../../../api/axios.js";
import { saveAuthData } from "../services/authStorage.js";

/**
 * Login request
 */
export const loginRequest = async (payload) => {
  try {
    console.log("Sending login request:", payload);

    const { data } = await axios.post("/auth/login", payload);

    console.log("Login success:", data);

    if (data?.accessToken) {
      saveAuthData(data.accessToken);
    }

    return data;
  } catch (error) {
    console.error("Login failed:", error);

    const message =
      error?.response?.data?.message ||
      error.message ||
      "Login failed";

    throw new Error(message);
  }
};