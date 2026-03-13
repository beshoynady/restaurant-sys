import mongoose from "mongoose";
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const notificationSettingsSchema = new Schema(
  {
    // 🔗 Relations
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    // 🔔 Enable / Disable notifications at branch level
    enabled: {
      type: Boolean,
      default: true,
    },

    /**
     * =========================
     * 📦 ORDER NOTIFICATIONS
     * =========================
     */
    orders: {
      newOrder: {
        enabled: { type: Boolean, default: true },
        roles: {
          cashier: { type: Boolean, default: true },
          kitchen: { type: Boolean, default: true },
          manager: { type: Boolean, default: false },
        },
        channels: {
          inApp: { type: Boolean, default: true },
          sound: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
        },
      },

      orderReady: {
        enabled: { type: Boolean, default: true },
        roles: {
          waiter: { type: Boolean, default: true },
          delivery: { type: Boolean, default: true },
        },
        channels: {
          inApp: { type: Boolean, default: true },
          sound: { type: Boolean, default: true },
        },
      },

      orderCancelled: {
        enabled: { type: Boolean, default: true },
        roles: {
          cashier: true,
          manager: true,
        },
        channels: {
          inApp: true,
          push: false,
        },
      },
    },

    /**
     * =========================
     * 🍳 KITCHEN NOTIFICATIONS
     * =========================
     */
    preparationSection: {
      newOrder: {
        enabled: { type: Boolean, default: true },
        channels: {
          screen: { type: Boolean, default: true },
          sound: { type: Boolean, default: true },
        },
      },

      delayedOrder: {
        enabled: { type: Boolean, default: false },
        delayMinutes: { type: Number, default: 15 },
        roles: {
          manager: true,
        },
      },
    },

    /**
     * =========================
     * 📦 INVENTORY NOTIFICATIONS
     * =========================
     */
    inventory: {
      lowStock: {
        enabled: { type: Boolean, default: true },
        thresholdType: {
          type: String,
          enum: ["minimum", "reorder"],
          default: "minimum",
        },
        roles: {
          storekeeper: true,
          manager: true,
        },
      },

      outOfStock: {
        enabled: { type: Boolean, default: true },
        roles: {
          cashier: true,
          kitchen: true,
          manager: true,
        },
      },
    },

    /**
     * =========================
     * 💰 FINANCIAL NOTIFICATIONS
     * =========================
     */
    finance: {
      shiftClosed: {
        enabled: { type: Boolean, default: true },
        roles: {
          manager: true,
          accountant: true,
        },
      },

      paymentFailed: {
        enabled: { type: Boolean, default: true },
        roles: {
          cashier: true,
          manager: true,
        },
      },
    },

    /**
     * =========================
     * 📅 RESERVATION NOTIFICATIONS
     * =========================
     */
    reservations: {
      newReservation: {
        enabled: { type: Boolean, default: true },
        roles: {
          receptionist: true,
          manager: true,
        },
      },

      reservationReminder: {
        enabled: { type: Boolean, default: false },
        reminderBeforeMinutes: { type: Number, default: 30 },
        channels: {
          push: true,
          whatsapp: false,
        },
      },
    },

    /**
     * =========================
     * 👤 CUSTOMER NOTIFICATIONS
     * =========================
     */
    customer: {
      orderStatusUpdates: {
        enabled: { type: Boolean, default: true },
        channels: {
          push: true,
          whatsapp: false,
          sms: false,
        },
      },

      promotions: {
        enabled: { type: Boolean, default: false },
        channels: {
          push: true,
          email: false,
        },
      },
    },

    /**
     * =========================
     * ⚙️ SYSTEM
     * =========================
     */
    system: {
      dailyReport: {
        enabled: { type: Boolean, default: false },
        sendAt: { type: String, default: "23:59" },
        roles: {
          manager: true,
        },
      },
    },

    // 🧾 Audit
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee" },
  },
  { timestamps: true }
);

// 🔹 One settings document per branch
notificationSettingsSchema.index({ branch: 1 }, { unique: true });


const NotificationSettingsModel = mongoose.model("NotificationSettings", notificationSettingsSchema);

export NotificationSettingsModel;