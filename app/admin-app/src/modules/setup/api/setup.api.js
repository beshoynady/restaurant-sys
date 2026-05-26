import axios from "axios";
import { baseURL } from "../../../api/axios.js";

/**
 * 🚀 Initialize System Setup
 * --------------------------
 * Sends first-time setup data:
 * - Brand
 * - Branch
 * - Owner User
 *
 * Backend returns:
 * - accessToken
 * - user
 * - refreshToken cookie (HttpOnly)
 */
export const initializeSetup = async (data) => {
  try {
    // =============================
    // 🔍 DEBUG REQUEST (DEV ONLY)
    // =============================
    if (import.meta.env.DEV) {
      console.log("🚀 Setup Payload:", data);
    }

    // =============================
    // 📡 SEND REQUEST
    // =============================
    const res = await axios.post(
      `${baseURL}/setup/initialize`,
      data,
      {
        // IMPORTANT:
        // Allows browser to receive/send cookies
        withCredentials: true,
      }
    );

    // =============================
    // 📦 EXTRACT RESPONSE DATA
    // =============================
    const responseData = res.data;

    const {
      accessToken,
      user,
      brand,
      branch,
    } = responseData;

    // =============================
    // 🔐 STORE ACCESS TOKEN
    // =============================
    // Temporary solution:
    // Store access token locally
    //

    localStorage.setItem("accessToken", accessToken);

    // =============================
    // 🔍 DEBUG RESPONSE (DEV ONLY)
    // =============================
    if (import.meta.env.DEV) {
      console.log("✅ Setup Success:", responseData);

      console.log("🔐 Access Token Saved");

      console.log("👤 User:", user);

      console.log("🏢 Brand:", brand);

      console.log("🏪 Branch:", branch);
    }

    // =============================
    // ✅ RETURN CLEAN DATA
    // =============================
    return responseData;
  } catch (error) {
    // =============================
    // ❌ HANDLE ERRORS
    // =============================
    console.error("❌ Setup Error:", error);

    const message =
      error?.response?.data?.message ||
      error.message ||
      "Setup initialization failed";

    throw new Error(message);
  }
};