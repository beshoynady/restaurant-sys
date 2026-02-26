const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const PreparationSectionConfigSchema = new mongoose.Schema(
  {
    /** Brand & Branch scope */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },

    /** Section details */
    name: {
      type: Map,
      of: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    description: {
      type: Map,
      of: String,
      trim: true,
      maxlength: 300,
    },

    /** Preparation logic */
    averagePreparationTime: { type: Number, default: 10, min: 0 }, // minutes
    maxParallelTickets: { type: Number, default: 5, min: 1 }, // Max tickets this section can handle simultaneously
    allowPartialDelivery: { type: Boolean, default: true }, // Can tickets be sent separately or wait for full order

    /** Delivery relevance */
    isDeliveryRelevant: { type: Boolean, default: true },

    /** Ticket settings */
    autoAssignChef: { type: Boolean, default: true }, // Auto-assign responsible employee
    requireConfirmationBeforeSend: { type: Boolean, default: false }, // Chef must confirm ticket before sending to waiter
    allowRejectTickets: { type: Boolean, default: true }, // Chef can reject ticket if out of stock

    /** Audit & status */
    isActive: { type: Boolean, default: true },
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "Employee", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent duplicates per brand/branch and code
PreparationSectionConfigSchema.index(
  { brand: 1, branch: 1, code: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model(
  "PreparationSectionConfig",
  PreparationSectionConfigSchema
);
