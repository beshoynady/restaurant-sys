// src/modules/setup/hooks/useSetupSubmit.js

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import { initializeSetup } from "../api/setup.api";

/**
 * 🚀 Setup Submit Hook
 * -----------------------------------
 * Handles:
 * - API request
 * - loading state
 * - success handling
 * - error handling
 * - redirect
 */

export default function useSetupSubmit({ onSuccess }) {
  // ================= STATE =================
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // ================= SUBMIT =================
  const submitSetup = async (formData) => {
    try {
      setIsSubmitting(true);

      // ================= API CALL =================
      const response = await initializeSetup(formData);

      // ================= SUCCESS =================
      toast.success("System initialized successfully");

      console.log("✅ SETUP RESPONSE:", response);

      // Optional callback
      if (onSuccess) {
        onSuccess(response);
      }

      // Redirect after small delay
      setTimeout(() => {
        navigate("/admin");
      }, 1500);

      return response;
    } catch (error) {
      console.error("❌ SETUP SUBMIT ERROR:", error);

      toast.error(error.message || "Setup initialization failed");

      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitSetup,
    isSubmitting,
  };
}
