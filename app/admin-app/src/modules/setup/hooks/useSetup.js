import { useState } from "react";

/**
 * 🧠 Safe deep update helper
 * Handles nested objects immutably
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
      current[key] = { ...current[key] };
    }
    current = current[key];
  });

  current[lastKey] = value;

  return newObj;
};

/**
 * 🚀 Setup Form Hook
 * Handles brand / owner / branch nested state safely
 */
export const useSetupForm = () => {
  const [form, setForm] = useState({
    // ================= BRAND =================
    brand: {
      name: {
        EN: "",
        AR: "",
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
        EN: "",
        AR: "",
      },
      address: {
        EN: {
          country: "",
          city: "",
          area: "",
          street: "",
        },
        AR: {
          country: "",
          city: "",
          area: "",
          street: "",
        },
      },
      postalCode: "",
      taxIdentificationNumber: "",
    },
  });

  /**
   * ✏️ Generic update function
   * Supports: "brand.name.EN"
   */
  const update = (path, value) => {
    setForm((prev) => setDeepValue(prev, path, value));
  };

  /**
   * 🔄 Reset form
   */
  const reset = () => {
    setForm({
      brand: {
        name: { EN: "", AR: "" },
        legalName: "",
        logo: "",
        taxIdNumber: "",
        companyRegister: "",
      },
      owner: {
        username: "",
        password: "",
        email: "",
        phone: "",
      },
      branch: {
        name: { EN: "", AR: "" },
        address: {
          EN: { country: "", city: "", area: "", street: "" },
          AR: { country: "", city: "", area: "", street: "" },
        },
        postalCode: "",
        taxIdentificationNumber: "",
      },
    });
  };

  return {
    form,
    update,
    reset,
  };
};