import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const PreparationReturnSettingsSchema = new Schema(
  {
    /** Scope */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    // Same confirmed dangling-reference fix as Product/PreparationTicket/ProductionRecord/
    // Consumption/PreparationReturn this engagement — the registered model name is
    // "PreparationSectionConfig", not "PreparationSection".
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSectionConfig",
      default: null,
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

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

/** Unique per scope */
PreparationReturnSettingsSchema.index(
  { brand: 1, branch: 1, preparationSection: 1 },
  { unique: true },
);

export default mongoose.model(
  "PreparationReturnSettings",
  PreparationReturnSettingsSchema,
);
