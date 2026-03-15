import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * ===============================
 * Preparation Return Schema
 * Represents execution unit per preparation section
 * ===============================
 */
const PreparationReturnSchema = new Schema(
  {
    /** Brand & Branch context */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    /** Sequential ticket number (per branch/day) */
    ticketNumber: {
      type: Number,
      required: true,
      index: true,
    },

    /** Parent return invoice reference */
    returnInvoice: {
      type: ObjectId,
      ref: "SalesReturn",
      required: true,
      index: true,
    },

    /** Target preparation section (Kitchen, Grill, Bar, etc.) */
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
      required: true,
    },

    /** Kitchen employee responsible */
    responsibleEmployee: {
      type: ObjectId,
      ref: "Employee",
    },

    /** Assigned waiter (if any) */
    waiter: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    /**
     * Products included in this ticket
     * Each item maps to ONE order item
     */
    items: [
      {
        orderItemId: {
          type: ObjectId,
          required: true,
        },
        product: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          immutable: true,
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 300,
        },
        extras: [
          {
            extra: {
              type: ObjectId,
              ref: "Product",
            },
            quantity: {
              type: Number,
              default: 1,
            },
          },
        ],

        decision: {
          type: String,
          enum: ["WASTE", "RETURN_TO_STOCK", "RESELLABLE"],
          required: true,
        },

        reason: { type: String, trim: true },
      },
    ],

    /** Time tracking */
    receivedAt: {
      type: Date,
      required: true,
    },
    expectedReadyAt: {
      type: Date,
      required: true,
    },
    actualReadyAt: {
      type: Date,
    },

    /** Soft delete flag */
    isActive: {
      type: Boolean,
      default: true,
    },

    /** General notes */
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_REVIEW", "FINALIZED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    /** Audit fields */
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: ObjectId, ref: "Employee", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PreparationReturnSchema.index(
  { brand: 1, branch: 1, returnInvoice: 1, ticketNumber: 1 },
  { unique: true },
);

// export  the model
const PreparationReturnModel = mongoose.model(
  "PreparationReturn",
  PreparationReturnSchema,
);
export default PreparationReturnModel;
