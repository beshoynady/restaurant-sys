const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const PreparationReturnSettingsSchema = new Schema(
  {
    /** Scope */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
      default: null, // null = default لكل الأقسام
    },

    /** Allowed decisions */
    allowWaste: {
      type: Boolean,
      default: true,
    },

    allowReturnToStock: {
      type: Boolean,
      default: false,
    },

    allowResellable: {
      type: Boolean,
      default: false,
    },

    /** Decision ownership */
    decisionBy: {
      type: [ObjectId],
      ref: "JobTitle",
      required: true,
    },

    /** Stock behavior */
    affectInventory: {
      type: Boolean,
      default: true,
    },

    /** Safety rules */
    requireReasonForWaste: {
      type: Boolean,
      default: true,
    },

    requireReasonForReturn: {
      type: Boolean,
      default: true,
    },

    /** Time limits */
    maxReturnMinutesFromPreparation: {
      type: Number,
      default: 30,
      min: 0,
    },

    /** Workflow */
    requireSupervisorReview: {
      type: Boolean,
      default: false,
    },

    /** Ticket control */
    ticketImmutableAfterFinalize: {
      type: Boolean,
      default: true,
    },

    /** Status */
    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true },
);

/** Unique per scope */
PreparationReturnSettingsSchema.index(
  { brand: 1, branch: 1, preparationSection: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "PreparationReturnSettings",
  PreparationReturnSettingsSchema,
);
