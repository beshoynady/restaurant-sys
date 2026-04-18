import mongoose from "mongoose";
const { Schema, Types } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * Table Schema
 * Represents a physical table inside a restaurant branch.
 * Used for Dine-in, QR Ordering, and POS operations.
 */
const TableSchema = new Schema(
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

  // ─────────── Table Identity ───────────
  diningArea: {
    type: ObjectId,
    ref: "DiningArea",
    required: true,
  },

  tableNumber: {
    type: String,
    required: true,
    trim: true,
    // Example: "T01", "12", "A5"
  },

  tableCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
    // Used for QR ordering or Dine-in reference
  },

  // ─────────── Capacity ───────────
  minCapacity: {
    type: Number,
    default: 1,
    min: 1,
  },

  maxCapacity: {
    type: Number,
    required: true,
    min: 1,
    // Maximum number of guests allowed
  },

  // ─────────── Operational Status ───────────
  status: {
    type: String,
    enum: [
      "available",     // Ready for seating
      "occupied",      // Has active order
      "reserved",      // Reserved but not seated yet
      "cleaning",      // Needs cleaning
      "maintenance",   // Under maintenance
      "out_of_service" // Disabled
    ],
    default: "available",
    index: true,
  },

  // ─────────── QR & Ordering ───────────
  qrEnabled: {
    type: Boolean,
    default: false,
  },

  notes: {
    type: String,
    trim: true,
    maxlength: 250,
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

  deletedAt: {
    type: Date,
    default: null,
    // Soft delete support
  },

},
{
  timestamps: true,
}
);

// ─────────── Indexes ───────────

// Prevent duplicate table numbers inside the same branch
TableSchema.index(
  { branch: 1, tableNumber: 1 },
  { unique: true }
);

TableSchema.index(
  { branch: 1, tableCode: 1 },
  { unique: true }
);

// Fast lookup for QR & POS
TableSchema.index({ branch: 1, status: 1 });

export default mongoose.model("Table", TableSchema);
