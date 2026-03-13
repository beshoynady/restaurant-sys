import mongoose from "mongoose";
const { Schema, ObjectId } = mongoose;

/**
 * Reservation Schema
 * Handles table reservations for dine-in customers.
 * Supports confirmation, arrival, cancellation, and no-show scenarios.
 */
const ReservationSchema = new Schema(
  {
    // ─────────── Organization Context ───────────
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    // ─────────── Table Information ───────────
    table: {
      type: ObjectId,
      ref: "Table",
      required: true,
      index: true,
    },

    // ─────────── Customer Information ───────────
    customer: {
      type: ObjectId,
      ref: "Customer",
      default: null,
      // Optional for walk-in reservations
    },
    user:{
      type: ObjectId,
      ref: "User",
      default: null,
    },

    // ─────────── Reservation Details ───────────
    guestsCount: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },

    reservationDate: {
      type: Date,
      required: true,
      index: true,
      // Date of reservation (business date)
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: "End time must be after start time",
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 255,
    },

    // ─────────── Reservation Lifecycle ───────────
    status: {
      type: String,
      enum: [
        "pending",        // Awaiting confirmation
        "confirmed",      // Confirmed by staff
        "seated",         // Customer arrived & seated
        "completed",      // Finished & left
        "cancelled",      // Cancelled by client or staff
        "no_show",        // Customer did not arrive
      ],
      default: "pending",
      index: true,
    },

    arrivalTime: {
      type: Date,
      default: null,
      // When the customer actually arrives
    },

    // ─────────── Order Linking ───────────
    linkedOrder: {
      type: ObjectId,
      ref: "Order",
      default: null,
      // Order created from this reservation
    },

    // ─────────── Audit ───────────
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },

    updatedBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    cancelledBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─────────── Indexes ───────────

// Prevent double booking for same table & time window
ReservationSchema.index({
  table: 1,
  startTime: 1,
  endTime: 1,
});

// Fast reservation lookup per day
ReservationSchema.index({
  branch: 1,
  reservationDate: 1,
  status: 1,
});

export default mongoose.model("Reservation", ReservationSchema);
