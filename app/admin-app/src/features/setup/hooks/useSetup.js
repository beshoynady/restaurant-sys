
/* =====================================
   📁 features/setup/hooks/useSetup.js
===================================== */

import { useState } from "react";
import { initializeSystem } from "../api/setup.api";

export const useSetup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSetup = async (data) => {
    try {
      setLoading(true);
      setError(null);
      const res = await initializeSystem(data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Error");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { runSetup, loading, error };
};
