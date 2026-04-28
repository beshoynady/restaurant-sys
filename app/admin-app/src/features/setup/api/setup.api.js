import axios from "axios";
import { baseURL } from "../../../api/axios.js";

/**
 * 🚀 Initialize System Setup
 * --------------------------
 * Sends first-time setup data:
 * brand + branch + owner
 */
export const initializeSetup = async (data) => {
  try {
    // Debug only in development
    if (import.meta.env.DEV) {
      console.log("🚀 Setup Payload:", data);
    }

    const res = await axios.post(
      `${baseURL}/setup/initialize`,
      data
    );

    return res.data;
  } catch (error) {
    // =============================
    // 🔥 Unified Error Handling
    // =============================
    const message =
      error?.response?.data?.message ||
      error.message ||
      "Setup initialization failed";

    throw new Error(message);
  }
};