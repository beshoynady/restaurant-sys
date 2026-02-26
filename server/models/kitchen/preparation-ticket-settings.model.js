const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * ================================
 * PREPARATION TICKET SETTINGS
 * ================================
 * Configurable rules per brand/branch for kitchen/preparation tickets
 */
const preparationTicketSettingsSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null }, // null = default for all branches

    // Ticket numbering
    ticketSequence: {
      prefix: { type: String, default: "TCK-" },
      currentNumber: { type: Number, default: 1 },
      lastResetDate: { type: String, default: null }, // YYYY-MM-DD
      resetDaily: { type: Boolean, default: true },
    },

    // Auto-send ticket to waiter when ready
    autoSendToWaiter: { type: Boolean, default: true },

    // Policy for delivering tickets
    deliveryPolicy: {
      type: String,
      enum: ["IMMEDIATE", "WAIT_ALL"], // IMMEDIATE: send as ready, WAIT_ALL: wait for all tickets
      default: "IMMEDIATE",
    },

    // Maximum time to prepare the ticket (minutes)
    maxPreparationTime: { type: Number, default: 20, min: 1 },

    // Allow rejection of ticket by kitchen
    allowRejectTicket: { type: Boolean, default: false },

    // Auto-merge tickets of same order
    autoMergeTickets: { type: Boolean, default: false },

    // Allow editing ticket after sent to kitchen
    allowEditAfterSent: { type: Boolean, default: false },

    // Audit
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure one settings document per brand/branch
preparationTicketSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

const PreparationTicketSettings = model(
  "PreparationTicketSettings",
  preparationTicketSettingsSchema
);

module.exports = PreparationTicketSettings;
