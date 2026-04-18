import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const shiftSchema = new mongoose.Schema(
  {
    // Brand reference (for multi-brand systems)
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      index: true,
      
    },

    // Branch reference (for multi-branch systems)
    branch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
      index: true,
      
    },

    // Localized display name for the shift
    name: {
  type: Map,
  of: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  required: true,
},

    // Unique internal code for business logic & uniqueness
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
      
    },

    // Type of shift
    shiftType: {
      type: String,
      enum: ["morning", "afternoon", "night", "custom", "flexible", "other"],
      required: true,
      
    },

    // Start time of shift in minutes from midnight (0-1439)
    startMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
      
    },

    // End time of shift in minutes from midnight (0-1439)
    endMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
      
    },

    // Current operational status
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
      
    },

    // Additional notes for the shift
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      
    },

    // Audit fields
    createdBy: {
      type: ObjectId,
      ref: "UserAccount",
      required: true,
      
    },

    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
      
    },

    deletedBy: {
      type: ObjectId,
      ref: "UserAccount",
      default: null,
      
    },

    deletedAt: {
      type: Date,
      default: null,
      
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

/* =========================
   INDEXES
========================= */

// Unique shift code per brand for internal logic
shiftSchema.index({ brand: 1, code: 1 }, { unique: true });

// Unique shift name per branch per brand (soft delete safe)
shiftSchema.index(
  { brand: 1, branch: 1, code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

// Optional: fast filtering by shift type per branch
shiftSchema.index({ brand: 1, branch: 1, shiftType: 1 });

// Optional: fast queries by start and end time for scheduling
shiftSchema.index({ branch: 1, startMinutes: 1, endMinutes: 1 });

export default mongoose.model("Shift", shiftSchema);
