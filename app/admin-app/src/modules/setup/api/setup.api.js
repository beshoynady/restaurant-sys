// src/modules/setup/api/setup.api.js

import axios from "axios";

import { baseURL } from "../../../api/axios.js";

/**
 * 🚀 Initialize Full System
 * -----------------------------------
 * Creates:
 * - Brand
 * - Main Branch
 * - Owner Account
 *
 * Backend returns:
 * - accessToken
 * - user
 * - brand
 * - branch
 *
 * Refresh token stored in HttpOnly cookie.
 */

export const initializeSetup = async (payload) => {
  try {
    // =============================
    // DEBUG REQUEST
    // =============================
    if (import.meta.env.DEV) {
      console.group("🚀 SYSTEM INITIALIZATION");

      console.log("Payload:", payload);

      console.groupEnd();
    }

    // =============================
    // API REQUEST
    // =============================
    const response = await axios.post(`${baseURL}/setup/initialize`, payload, {
      withCredentials: true,
    });

    // =============================
    // RESPONSE DATA
    // =============================
    const responseData = response.data;

    const { accessToken, user, brand, branch } = responseData;

    // =============================
    // STORE ACCESS TOKEN
    // =============================
    /**
     * Temporary Solution
     *
     * Later:
     * - Zustand
     * - Redux Toolkit
     * - Context API
     */

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }

    // =============================
    // DEBUG SUCCESS
    // =============================
    if (import.meta.env.DEV) {
      console.group("✅ SYSTEM INITIALIZED");

      console.log("User:", user);

      console.log("Brand:", brand);

      console.log("Branch:", branch);

      console.log("Access Token Stored");

      console.groupEnd();
    }

    // =============================
    // RETURN CLEAN RESPONSE
    // =============================
    return {
      success: true,

      accessToken,

      user,

      brand,

      branch,
    };
  } catch (error) {
    // =============================
    // NORMALIZED ERROR
    // =============================
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "System initialization failed";

    // =============================
    // DEBUG ERROR
    // =============================
    console.error("❌ SYSTEM INITIALIZATION ERROR:", error);

    throw new Error(message);
  }
};
