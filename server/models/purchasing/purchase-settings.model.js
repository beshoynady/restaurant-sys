import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * Purchase & Purchase Return Settings
 * ----------------------------------
 * This schema defines all configurable policies related to:
 * - Purchase invoices
 * - Purchase return invoices
 * Per Brand and (optionally) per Branch
 */

const PurchaseSettingsSchema = new mongoose.Schema(
  {
    // ===============================
    // Multi-tenant references
    // ===============================
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null, // null = applies to all branches
    },

    // ===============================
    // Purchase Invoice Settings
    // ===============================
    purchase: {
      /**
       * Purchase invoice numbering configuration
       */
      sequence: {
        prefix: { type: String, default: "PUR-" },
        startNumber: { type: Number, default: 1 },
        currentNumber: { type: Number, default: 1 },
        resetPolicy: {
          type: String,
          enum: ["NONE", "MONTHLY", "YEARLY"],
          default: "YEARLY",
        },
      },

      /**
       * Supplier invoice number is mandatory
       */
      requireSupplierInvoiceNumber: {
        type: Boolean,
        default: true,
      },

      /**
       * Prevent posting purchase if it causes negative stock
       */
      preventNegativeStock: {
        type: Boolean,
        default: true,
      },

      /**
       * Allow partial payments for purchase invoices
       */
      allowPartialPayment: {
        type: Boolean,
        default: false,
      },

      /**
       * Require managerial approval before posting purchase invoice
       */
      requireApprovalBeforePosting: {
        type: Boolean,
        default: true,
      },

      /**
       * Default credit period in days (for supplier credit purchases)
       */
      defaultPaymentTermDays: {
        type: Number,
        default: 30,
      },
    },

    // ===============================
    // Purchase Return Settings
    // ===============================
    purchaseReturn: {
      /**
       * Purchase return invoice numbering configuration
       */
      sequence: {
        prefix: { type: String, default: "PRR-" },
        startNumber: { type: Number, default: 1 },
        currentNumber: { type: Number, default: 1 },
        resetPolicy: {
          type: String,
          enum: ["NONE", "MONTHLY", "YEARLY"],
          default: "YEARLY",
        },
      },

      /**
       * Require reference to original purchase invoice
       */
      requireOriginalInvoice: {
        type: Boolean,
        default: true,
      },

      /**
       * Allow returning part of the original invoice quantities
       */
      allowPartialReturn: {
        type: Boolean,
        default: true,
      },

      /**
       * Allow return even if items are not physically available in stock
       * (financial return only)
       */
      allowReturnWithoutStock: {
        type: Boolean,
        default: false,
      },

      /**
       * Require approval before posting return invoice
       */
      requireApprovalBeforePosting: {
        type: Boolean,
        default: true,
      },

      /**
       * Automatically generate accounting journal entry on posting
       */
      autoPostAccountingEntry: {
        type: Boolean,
        default: false,
      },

      /**
       * Allowed refund methods for purchase returns
       */
      allowedRefundTypes: {
        type: [String],
        enum: ["cash", "credit", "deduct_supplier_balance"],
        default: ["cash", "deduct_supplier_balance"],
      },

      /**
       * Default refund method if not selected by user
       */
      defaultRefundType: {
        type: String,
        enum: ["cash", "credit", "deduct_supplier_balance"],
        default: "deduct_supplier_balance",
      },

      /**
       * Determines whether return affects inventory quantities
       */
      returnAffectsInventory: {
        type: Boolean,
        default: true,
      },
    },

    // ===============================
    // Tax Configuration (Shared)
    // ===============================
    /**
     * Allow tax to be applied at item (line) level
     */
    allowItemLevelTax: {
      type: Boolean,
      default: true,
    },

    /**
     * Allow tax to be applied at invoice level
     */
    allowInvoiceLevelTax: {
      type: Boolean,
      default: true,
    },

    /**
     * Tax calculation method:
     * - Inclusive: prices include tax
     * - Exclusive: tax added on top of prices
     */
    taxCalculationMethod: {
      type: String,
      enum: ["Inclusive", "Exclusive"],
      default: "Exclusive",
    },

    // ===============================
    // Audit & Control
    // ===============================
    createdBy: {
      type: ObjectId,
      ref: "Employee",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "Employee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Ensure one settings document per brand & branch
 */
PurchaseSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export mongoose.model(
  "PurchaseSettings",
  PurchaseSettingsSchema
);
