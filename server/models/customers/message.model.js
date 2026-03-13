import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const customerMessageSchema = new mongoose.Schema(
  {
    /* ===========================
       🔹 Multi-Tenant
    =========================== */
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

    /* ===========================
       🔹 Sender Info
    =========================== */
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      index: true,
    },

    senderType: {
      type: String,
      enum: ["OnlineCustomer", "OfflineCustomer", "Table"],
      default: null,
    },

    referenceId: {
      type: ObjectId,
      refPath: "senderType",
      default: null,
    },

    /* ===========================
    🔹 Related Order
    =========================== */
    order: {
      type: ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    /* ===========================
       🔹 Classification
    =========================== */
    category: {
      type: String,
      enum: ["GENERAL", "COMPLAINT", "ORDER_ISSUE", "SUGGESTION"],
      default: "GENERAL",
      index: true,
    },
    /* ===========================
    🔹 Message Content
    =========================== */
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000,
    },

    /* ===========================
       🔹 Workflow
    =========================== */
    status: {
      type: String,
      enum: ["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED"],
      default: "NEW",
      index: true,
    },

    isSeen: {
      type: Boolean,
      default: false,
      index: true,
    },

    assignedTo: {
      type: ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    resolvedBy: {
      type: ObjectId,
      ref: "Employee",
    },

    resolvedAt: {
      type: Date,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },

    /* ===========================
       🔹 Soft Delete
    =========================== */
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true },
);

/* ===========================
   🔹 Indexes
=========================== */

customerMessageSchema.index({ brand: 1, status: 1 });
customerMessageSchema.index({ brand: 1, priority: 1 });
customerMessageSchema.index({ brand: 1, branch: 1 });
customerMessageSchema.index({ senderType: 1, referenceId: 1 });

const CustomerMessageModel = mongoose.model("CustomerMessage", customerMessageSchema);

export CustomerMessageModel;