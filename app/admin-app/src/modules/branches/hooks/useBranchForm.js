import { useState, useEffect } from "react";

/**
 * Handles branch settings state separately but linked to branch
 */
export default function useBranchSettings(branchId) {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    if (branchId) {
      loadSettings(branchId);
    } else {
      setSettings(initialSettings);
    }
  }, [branchId]);

  const loadSettings = (id) => {
    // MOCK (replace API)
    setSettings({
      ...initialSettings,
      contact: {
        phone: [{ label: "Main", number: "01000000000" }],
        whatsapp: "01000000000",
        email: "branch@test.com",
      },
      timezone: "Africa/Cairo",
      isActive: true,
    });
  };

  const updateSettings = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return {
    settings,
    setSettings,
    updateSettings,
  };
}

const initialSettings = {
  contact: {
    phone: [],
    whatsapp: "",
    email: "",
  },
  timezone: "Africa/Cairo",
  operatingHours: [],
  features: [],
  usesReservationSystem: false,
  offersCurbsidePickup: false,
  offersOnlinePayment: false,
  offersCashOnDelivery: false,
  hasLoyaltyProgram: false,
  supportsGiftCards: false,
  supportsReferrals: false,
  isActive: true,
};
