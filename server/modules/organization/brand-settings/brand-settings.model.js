import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const brandSettingsSchema = new mongoose.Schema(
  {
    // =========================
    // 🔗 BRAND LINK
    // =========================
    brand: {
      type: ObjectId,
      ref: "Brand",
      unique: true,
      required: true,
    },

    // =========================
    // 🗂️ DASHBOARD CONFIGURATION
    // =========================
    dashboardLanguages: {
      type: [String],
      enum: ["EN", "AR", "FR", "ES", "IT", "ZH", "JA", "RU"],
      default: ["EN", "AR"],
    },
    defaultDashboardLanguage: { type: String, default: "EN", required: true },

    // =========================
    // 🧩 CORE SYSTEM MODULES
    // =========================
    features: {
      // 🍽️ MENU (essential for any restaurant)
      menu: {
        enabled: { type: Boolean, default: true },
      },

      // 🛒 SALES / POS (essential)
      sales: {
        enabled: { type: Boolean, default: true },
      },

      // 👨‍🍳 PREPARATION (KDS / Stations)
      preparation: {
        enabled: { type: Boolean, default: true },
      },

      // 🪑 SEATING
      seating: {
        enabled: { type: Boolean, default: true },
      },

      // 💳 PAYMENTS
      payments: {
        enabled: { type: Boolean, default: true },
      },

      // =========================
      // 🟡 OPTIONAL MODULES
      // =========================

      // 🚚 DELIVERY
      delivery: {
        enabled: { type: Boolean, default: false },
      },

      // 📦 INVENTORY
      inventory: {
        enabled: { type: Boolean, default: false },
      },

      // 🎯 CRM
      crm: {
        enabled: { type: Boolean, default: false },
      },

      // 🎁 LOYALTY
      loyalty: {
        enabled: { type: Boolean, default: false },
      },

      // 👨‍💼 HR
      hr: {
        enabled: { type: Boolean, default: false },
      },

      // =========================
      // 🔵 ENTERPRISE MODULES
      // =========================

      // 📊 ACCOUNTING
      accounting: {
        enabled: { type: Boolean, default: false },
      },

      // 🏭 PRODUCTION
      production: {
        enabled: { type: Boolean, default: false },
      },

      // 🧾 PURCHASING
      purchasing: {
        enabled: { type: Boolean, default: false },
      },

      // 🏢 ASSETS
      assets: {
        enabled: { type: Boolean, default: false },
      },
    },

    // =========================
    // ⚙️ SYSTEM FLAGS
    // =========================
    maintenanceMode: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // =========================
    // 📝 AUDIT
    // =========================
    createdBy: { type: ObjectId, ref: "UserAccount" },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

export default mongoose.model("BrandSettings", brandSettingsSchema);
