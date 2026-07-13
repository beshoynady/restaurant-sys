import mongoose from "mongoose";
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/**
 * ============================
 * Order Item Schema
 * Represents ONE ordered item (quantity is always 1)
 * Extras and variations create new order items
 * ============================
 */
const OrderItemSchema = new Schema(
  {
    // Reference to the main product
    product: {
      type: ObjectId,
      ref: "Product",
      required: true,
    },

    // Quantity is always 1 (restaurant best practice)
    quantity: {
      type: Number,
      default: 1,
      immutable: true,
    },

    // Snapshot of product price at ordering time
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Selected extras/addons for this item
     * Stored as snapshot to avoid price changes issues
     */
    extras: [
      {
        extra: {
          type: ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Total extras price for this item
    extrasTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Final calculated price for this item
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Special notes (no onions, extra spicy, etc.)
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * Kitchen lifecycle status
     * Controls preparation & invoice eligibility
     */
    status: {
      type: String,
      enum: [
        "NEW",
        "SENT_TO_PRODUCTION",
        "PREPARING",
        "READY",
        "DELIVERED",
        "CANCELLED",
        "REJECTED",
      ],
      default: "NEW",
      index: true,
    },
  },
  { _id: true },
);

/**
 * ============================
 * Order Schema (Operational Only)
 * Handles ordering & preparation flow
 * NO accounting logic here
 * ============================
 */
const OrderSchema = new Schema(
  {
    /** Brand & Branch context */
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    // Order number, unique per branch — see the {brand,branch,orderNum} compound index below (DB-003)
    orderNum: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    // Reference to the cashier shift
    cashierShift: {
      type: ObjectId,
      ref: "CashierShift",
      required: true,
    },

    // Order type
    orderType: {
      type: String,
      enum: ["DINE_IN", "DELIVERY", "TAKEAWAY", "INTERNAL"],
      required: true,
    },

    iternalOrderCategory: {
      type: String,
      enum: ["STAFF", "GUEST", "OTHER"],
      default: null,
    },

    // inernal staff member (internal orders)
    staffMember: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    // Scheduled time for order fulfillment
    scheduledAt: {
      type: Date,
      default: null,
    },

    // Ordered items (each item = 1 unit)
    items: [OrderItemSchema],

    // Split order flag (shared table bills)
    isSplit: {
      type: Boolean,
      default: false,
    },

    // Table reference (Dine-in only)
    table: {
      type: ObjectId,
      ref: "Table",
      default: null,
    },

    // Employee who created the order (cashier / waiter)
    orderBy: {
      type: ObjectId,
      ref: "Employee",
      default: null,
    },

    // DB-016: `user`/`customer` previously referenced model names "User"/"Customer",
    // which do not exist anywhere in the codebase (the real models are "OnlineCustomer"/
    // "OfflineCustomer") — `.populate()` on either field silently failed to resolve.
    // Replaced with a single polymorphic reference, matching the pattern already
    // established in crm/message/message.model.js. An order with neither field set
    // remains a valid anonymous/walk-in order.
    customerType: {
      type: String,
      enum: ["OnlineCustomer", "OfflineCustomer"],
      default: null,
    },
    customer: {
      type: ObjectId,
      refPath: "customerType",
      default: null,
    },

    /**
     * Order operational status
     * Controls order lifecycle
     */

    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "READY",
        "DELIVERED",
        "CLOSED",
        "CANCELLED",
      ],
      default: "OPEN",
      index: true,
    },

    /**
     * Determines if this ticket can be delivered
     * independently or must wait for other tickets
     */
    deliveryPolicy: {
      type: String,
      enum: [
        "IMMEDIATE", // Deliver once ready
        "WAIT_ALL", // Wait until all order tickets are ready
        "SCHEDULED", // Deliver at scheduled time
      ],
      required: true,
    },

    /**
     * Client assistance requests (table service)
     */
    clientAssistance: [
      {
        requestType: {
          type: String,
          enum: ["NONE", "CALL_WAITER", "REQUEST_BILL"],
          default: "NONE",
        },
        progressStatus: {
          type: String,
          enum: ["PENDING", "ASSIGNED", "ON_THE_WAY", "DONE"],
          default: "PENDING",
        },
        waiter: {
          type: ObjectId,
          ref: "Employee",
          default: null,
        },
      },
    ],

    // Indicates if order is active in the system
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Payment status (linked later to Invoice)
     * No financial data stored here
     */
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED", "CANCELLED"],
      default: "UNPAID",
    },
  },
  {
    timestamps: true,
  },
);

// DB-003: sequential document number, unique per branch (replaces the previous global-unique constraint)
OrderSchema.index({ brand: 1, branch: 1, orderNum: 1 }, { unique: true });

export default mongoose.model("Order", OrderSchema);
