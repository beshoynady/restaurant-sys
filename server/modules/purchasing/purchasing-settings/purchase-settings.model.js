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
    // Procurement Policy Engine (Supply Chain & Commerce Platform V5)
    // ===============================
    /**
     * SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §1 — one entity chain, three configurable maturity
     * levels. BASIC: Supplier -> PurchaseInvoice only (PurchaseOrder/GoodsReceiptNote still
     * created, just auto-generated behind the scenes, matching today's exact behavior). STANDARD:
     * PurchaseOrder -> GoodsReceiptNote -> PurchaseInvoice, explicitly created at each step.
     * ENTERPRISE: PurchaseRequest -> RFQ -> SupplierQuotation -> PurchaseOrder -> ... — RFQ is
     * enabled BY this policy value, never hardcoded to a specific level check scattered through
     * business logic (see purchase-settings.service.js#resolveProcurementPolicy).
     */
    procurementLevel: {
      type: String,
      enum: ["BASIC", "STANDARD", "ENTERPRISE"],
      default: "BASIC",
    },

    /**
     * Purchase Order numbering (STANDARD/ENTERPRISE) — via SequenceGeneratorService.
     */
    purchaseOrderSequence: {
      prefix: { type: String, default: "PO-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

    /** Goods Receipt Note numbering (all levels — auto-generated at BASIC). */
    goodsReceiptSequence: {
      prefix: { type: String, default: "GRN-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

    /** Purchase Request numbering (ENTERPRISE only). */
    purchaseRequestSequence: {
      prefix: { type: String, default: "PR-" },
      startNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      padding: { type: Number, default: 0 },
      resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "YEARLY" },
      lastResetDate: { type: Date, default: null },
    },

    /** Require a PurchaseOrder to be approved before a GRN can be raised against it (STANDARD/ENTERPRISE). */
    requirePOApproval: { type: Boolean, default: false },

    /** Three-way-match variance tolerance, as a percentage — SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §6. */
    matchToleranceRate: { type: Number, default: 0, min: 0, max: 100 },

    /** Whether a match variance beyond tolerance blocks PurchaseInvoice completion, or only flags it. */
    blockOnMatchVariance: { type: Boolean, default: false },

    /** Block new PurchaseInvoice creation if it would exceed Supplier.creditLimit. */
    enforceSupplierCreditLimit: { type: Boolean, default: false },

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
        // Was missing entirely — Mongoose silently strips any field not declared in the schema
        // from a `$set` update, so SequenceGeneratorService's reset-tracking write was a no-op
        // every time, causing the reset branch to fire on every single call instead of once per
        // period. Discovered via Supply Chain & Commerce Platform V5.1's Three-Way Matching
        // Engine tests reusing this exact sequence field.
        lastResetDate: { type: Date, default: null },
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
        lastResetDate: { type: Date, default: null }, // see purchase.sequence's identical fix, same bug
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
      ref: "UserAccount",
      required: true,
    },
    updatedBy: {
      type: ObjectId,
      ref: "UserAccount",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true }
);

/**
 * Ensure one settings document per brand & branch
 */
PurchaseSettingsSchema.index({ brand: 1, branch: 1 }, { unique: true });

export default mongoose.model(
  "PurchaseSettings",
  PurchaseSettingsSchema
);
