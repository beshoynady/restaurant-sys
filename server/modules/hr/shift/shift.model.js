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

    // Start time of shift in minutes from midnight (0-1439).
    // NOTE — overnight shifts: `endMinutes < startMinutes` is VALID and
    // means the shift crosses midnight (e.g. 22:00->06:00 is
    // startMinutes=1320, endMinutes=360). This is common for restaurants
    // (night shifts) and is intentionally not rejected — duration must be
    // computed with wraparound in mind, see shift.domain.js.
    startMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
    },

    // End time of shift in minutes from midnight (0-1439). See startMinutes
    // note on overnight shifts.
    endMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
      validate: {
        // start === end is inherently ambiguous (could mean "0 minutes" or
        // "24 hours") and wasn't rejected before — reject it explicitly
        // rather than silently accepting a meaningless shift template.
        validator(value) {
          return value !== this.startMinutes;
        },
        message: "A shift cannot have identical start and end times",
      },
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

    // Previously absent entirely (HR_TECHNICAL_DEBT.md HD-002) while
    // shift.service.js constructs its BaseRepository with soft-delete
    // enabled — same defect class as AttendanceRecord's (already fixed):
    // BaseRepository.buildBaseQuery()'s `{isDeleted: false}` filter matched
    // nothing since the field didn't exist, so every list/read query
    // returned zero results.
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  },
);

/* =========================
   INDEXES
========================= */

// Unique shift code per BRANCH (not brand-wide — Shift is inherently
// branch-scoped, so two different branches must each be able to use a
// simple code like "MORNING"). A brand-wide `{brand,code}` unique index
// used to also exist here, which made that impossible (a code used by one
// branch could never be reused by any other branch in the same brand) and
// was not soft-delete-aware either (a deleted shift's code could never be
// reused at all) — removed as contradictory with this correct index.
// partialFilterExpression uses `deletedAt: null` (not `isDeleted`, which
// was only just added) to match the pre-existing convention this index
// already used.
shiftSchema.index(
  { brand: 1, branch: 1, code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

// Optional: fast filtering by shift type per branch
shiftSchema.index({ brand: 1, branch: 1, shiftType: 1 });

// Optional: fast queries by start and end time for scheduling
shiftSchema.index({ branch: 1, startMinutes: 1, endMinutes: 1 });

export default mongoose.model("Shift", shiftSchema);
