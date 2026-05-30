// src/modules/setup/hooks/useSetup.js

import { useState } from "react";

/**
 * 🧠 Immutable deep update helper
 * -----------------------------------
 * Updates nested object values safely
 */

const setDeepValue = (obj, path, value) => {
  const keys = path.split(".");

  const lastKey = keys[keys.length - 1];

  const newObj = { ...obj };

  let current = newObj;

  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    } else {
      current[key] = {
        ...current[key],
      };
    }

    current = current[key];
  });

  current[lastKey] = value;

  return newObj;
};

/**
 * 🚀 Setup Form Hook
 * -----------------------------------
 * Handles:
 * - setup form state
 * - nested updates
 * - reset
 */

export const useSetupForm = () => {
  // ================= INITIAL STATE =================
  const initialState = {
    // ================= BRAND =================
    brand: {
      name: {
        en: "",
        ar: "",
      },

      legalName: "",

      logo: "",

      taxIdNumber: "",

      companyRegister: "",
    },

    // ================= OWNER =================
    owner: {
      username: "",

      password: "",

      email: "",

      phone: "",
    },

    // ================= BRANCH =================
    branch: {
      name: {
        en: "",
        ar: "",
      },

      address: {
        en: {
          country: "",
          city: "",
          area: "",
          street: "",
        },

        ar: {
          country: "",
          city: "",
          area: "",
          street: "",
        },
      },

      postalCode: "",

      taxIdentificationNumber: "",
    },
  };

  // ================= FORM STATE =================
  const [form, setForm] = useState(initialState);

  // ================= UPDATE FIELD =================
  const update = (path, value) => {
    setForm((prev) => setDeepValue(prev, path, value));
  };

  // ================= RESET FORM =================
  const reset = () => {
    setForm(initialState);
  };

  return {
    form,
    update,
    reset,
  };
};
