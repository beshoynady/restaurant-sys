
// src/modules/brand/hooks/useBrandForm.js
import { useState } from "react";

const initialBrandData = {
  _id: "brand_001",

  name: {
    EN: "Pizza Hut",
    AR: "بيتزا هت",
  },

  slug: "pizza-hut-eg",

  logo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",

  businessType: "restaurant",

  cuisineType: ["arabic", "american"],

  maxBranches: 20,

  currency: "EGP",

  decimalPlaces: 2,

  dashboardLanguages: ["EN", "AR"],

  defaultDashboardLanguage: "EN",

  legalName: "Pizza Hut Restaurants LLC",

  companyRegister: "123456789",

  taxIdNumber: "987654321",

  timezone: "Africa/Cairo",

  countryCode: "EG",

  setupStatus: "complete",

  status: "active",

  createdAt: "2026-01-15T10:00:00.000Z",

  updatedAt: "2026-06-01T14:00:00.000Z",
};

export function useBrandForm() {
  const [originalData] = useState(initialBrandData);

  const [formData, setFormData] = useState(initialBrandData);

  const [isEditing, setIsEditing] = useState(false);

  const updateNestedValue = (object, path, value) => {
    const clone = structuredClone(object);

    const keys = path.split(".");

    let current = clone;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;

    return clone;
  };

  const handleChange = (path, value) => {
    setFormData((prev) => updateNestedValue(prev, path, value));
  };

  const toggleArrayValue = (field, value) => {
    setFormData((prev) => {
      const exists = prev[field].includes(value);

      return {
        ...prev,
        [field]: exists
          ? prev[field].filter((item) => item !== value)
          : [...prev[field], value],
      };
    });
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData(structuredClone(originalData));

    setIsEditing(false);
  };

  const saveChanges = () => {
    console.log("Brand Updated:", formData);

    setIsEditing(false);
  };

  return {
    formData,
    isEditing,

    handleChange,
    toggleArrayValue,

    startEditing,
    cancelEditing,
    saveChanges,
  };
}
