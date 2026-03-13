import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * ===============================
 * Preparation Ticket Schema
 * Represents execution unit per preparation section
 * ===============================
 */
const PreparationTicketSchema = new Schema(
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

    /** Parent order reference */
    order: {
      type: ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    /** Target preparation section (Kitchen, Grill, Bar, etc.) */
    preparationSection: {
      type: ObjectId,
      ref: "PreparationSection",
      required: true,
    },

    /**
     * Preparation lifecycle status
     * Controlled by kitchen staff
     */
    preparationStatus: {
      type: String,
      enum: [
        "PENDING",
        "PREPARING",
        "READY",
        "CANCELLED",
        "REJECTED",
      ],
      default: "PENDING",
      index: true,
    },

    /**
     * Delivery status to waiter or pickup point
     * Independent from preparation
     */
    deliveryStatus: {
      type: String,
      enum: [
        "WAITING",
        "READY_FOR_HANDOVER",
        "HANDED_OVER",
      ],
      default: "WAITING",
      index: true,
    },

    /**
     * Determines if this ticket can be delivered
     * independently or must wait for other tickets
     */
    deliveryPolicy: {
      type: String,
      enum: [
        "IMMEDIATE",   // Deliver once ready
        "WAIT_ALL",    // Wait until all order tickets are ready
      ],
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

    /**
     * Ticket handover history
     * Used for audit & tracking
     */
    handoverEvents: [
      {
        handedAt: Date,
        handedBy: {
          type: ObjectId,
          ref: "Employee",
        },
        handedTo: {
          type: ObjectId,
          ref: "Employee",
        },
      },
    ],

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
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

PreparationTicketSchema.index({ brand: 1, branch: 1, order: 1, ticketNumber: 1 }, { unique: true });

// export  the model
const PreparationTicketModel = mongoose.model(
  "PreparationTicket",
  PreparationTicketSchema
);
export PreparationTicketModel;