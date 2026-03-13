import mongoose from "mongoose";
const { Schema, Types } = mongoose;

/**
 * DiningArea Schema
 * ------------------
 * Represents a front-of-house service area inside a branch.
 * Used to organize tables, POS flow, waiter assignments,
 * reservations, and QR ordering behavior.
 *
 * Examples:
 * - Indoor Hall
 * - Outdoor Area
 * - VIP Lounge
 * - Bar
 * - Takeaway Counter
 */
const DiningAreaSchema = new Schema(
  {
    // ─────────── Organization Context ───────────
    brand: {
      type: Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    branch: {
      type: Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    // ─────────── Identity ───────────
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      required: true,
      trim: true,
      // Example: { AR: "صالة داخلية", EN: "Indoor Hall" }
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
      // Example: INDOOR, VIP, BAR
    },

    /**
     * Area operational type
     * Used for POS behavior and filtering
     */
    type: {
      type: String,
      enum: ["dine_in", "takeaway", "bar", "delivery", "drive_thru", "other"],
      default: "dine_in",
    },

    // ─────────── Operational Rules ───────────
    priority: {
      type: Number,
      default: 1,
      // Used for sorting areas in POS
    },

    allowReservations: {
      type: Boolean,
      default: true,
      // If false, this area will not accept reservations
    },

    allowQR: {
      type: Boolean,
      default: true,
      // Controls QR ordering availability in this area
    },

    allowManualOrders: {
      type: Boolean,
      default: true,
      // Allow POS orders (cashier/waiter)
    },

    // ─────────── Status ───────────
    isActive: {
      type: Boolean,
      default: true,
      // If false, area will not appear in POS
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    // ─────────── Audit ───────────
    createdBy: {
      type: Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    updatedBy: {
      type: Types.ObjectId,
      ref: "Employee",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ─────────── Indexes ───────────

// Ensure unique area code per branch
DiningAreaSchema.index({ branch: 1, code: 1 }, { unique: true });

export mongoose.model("DiningArea", DiningAreaSchema);
