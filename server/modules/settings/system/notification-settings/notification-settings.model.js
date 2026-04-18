import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types;

const notificationSettingsSchema = new mongoose.Schema(
  {
    // 🔗 Relations
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    // 🔔 Enable / Disable notifications at branch level
    enabled: {
      type: Boolean,
      default: { type: Boolean, default: true },
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
          cashier: { type: Boolean, default: true },
          manager: { type: Boolean, default: true },
        },
        channels: {
          inApp: { type: Boolean, default: true },
          push: { type: Boolean, default: false },
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
          manager: { type: Boolean, default: true },
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
          storekeeper: { type: Boolean, default: true },
          manager: { type: Boolean, default: true },
        },
      },

      outOfStock: {
        enabled: { type: Boolean, default: true },
        roles: {
          cashier: {
            type: Boolean,
            default: { type: Boolean, default: true },
          },
          kitchen: {
            type: Boolean,
            default: { type: Boolean, default: true },
          },
          manager: {
            type: Boolean,
            default: { type: Boolean, default: true },
          },
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
          manager: { type: Boolean, default: true },
          accountant: { type: Boolean, default: true },
        },
      },

      paymentFailed: {
        enabled: { type: Boolean, default: true },
        roles: {
          cashier: { type: Boolean, default: true },
          manager: { type: Boolean, default: true },
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
          receptionist: { type: Boolean, default: true },
          manager: { type: Boolean, default: true },
        },
      },

      reservationReminder: {
        enabled: { type: Boolean, default: false },
        reminderBeforeMinutes: { type: Number, default: 30 },
        channels: {
          push: { type: Boolean, default: true },
          whatsapp: { type: Boolean, default: false },
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
          push: { type: Boolean, default: true },
          whatsapp: { type: Boolean, default: false },
          sms: { type: Boolean, default: false },
        },
      },

      promotions: {
        enabled: { type: Boolean, default: false },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
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
          manager: { type: Boolean, default: true },
        },
      },
    },

    // 🧾 Audit
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true }
);

// 🔹 One settings document per branch
notificationSettingsSchema.index({ branch: 1 }, { unique: true });


const NotificationSettingsModel = mongoose.model("NotificationSettings", notificationSettingsSchema);

export default NotificationSettingsModel;