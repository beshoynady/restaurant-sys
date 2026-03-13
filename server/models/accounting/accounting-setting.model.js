import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * AccountingSettings Schema
 * -------------------------
 * Central configuration for the entire accounting engine.
 * No operational document should contain account selection logic.
 * All accounting decisions are driven from here.
 */
const accountingSettingsSchema = new mongoose.Schema(
  {
    // ======================================================
    // Scope
    // ======================================================
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: true,
      unique: true,
      index: true,
    },

    /**
     * Optional branch-specific override.
     * If null → applies to all branches under the brand.
     */
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },

    // ======================================================
    // Global Control Accounts (System-Owned)
    // ======================================================
    controlAccounts: {
      cash: { type: ObjectId, ref: "Account", required: true },
      bank: { type: ObjectId, ref: "Account", required: true },

      accountsReceivable: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      accountsPayable: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      inventory: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      inventoryAdjustment: {
        type: ObjectId,
        ref: "Account",
        required: true, // used for count variance, wastage, damage
      },

      costOfGoodsSold: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      operatingExpense: {
        type: ObjectId,
        ref: "Account",
        required: true, // default non-COGS expenses
      },

      salesTaxPayable: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      purchaseTaxRecoverable: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      equityCapital: {
        type: ObjectId,
        ref: "Account",
        required: true,
      },

      retainedEarnings: {
        type: ObjectId,
        ref: "Account",
      },
    },

    // ======================================================
    // Activity → Account Mapping
    // ======================================================
    /**
     * Used by Accounting Engine to auto-generate journal entries
     * based on business activity.
     */
    activities: {
      sales: {
        revenue: { type: ObjectId, ref: "Account", required: true },
        tax: { type: ObjectId, ref: "Account", required: true },
        discount: { type: ObjectId, ref: "Account" },
        serviceCharge: { type: ObjectId, ref: "Account" },
        deliveryFee: { type: ObjectId, ref: "Account" },
        costOfSales: { type: ObjectId, ref: "Account", required: true },
      },

      salesReturn: {
        revenueContra: {
          type: ObjectId,
          ref: "Account",
          required: true,
        },
        discountContra: { type: ObjectId, ref: "Account" },
        serviceChargeContra: { type: ObjectId, ref: "Account" },
        deliveryFeeContra: { type: ObjectId, ref: "Account" },
        costOfSalesContra: {
          type: ObjectId,
          ref: "Account",
          required: true,
        },

        taxContra: { type: ObjectId, ref: "Account" },
      },

      purchase: {
        inventory: { type: ObjectId, ref: "Account", required: true },
        tax: { type: ObjectId, ref: "Account" },
        discount: { type: ObjectId, ref: "Account" },
      },

      purchaseReturn: {
        inventoryContra: {
          type: ObjectId,
          ref: "Account",
          required: true,
        },
        taxContra: { type: ObjectId, ref: "Account" },
      },

      expense: {
        defaultExpense: {
          type: ObjectId,
          ref: "Account",
          required: true,
        },
        tax: { type: ObjectId, ref: "Account" },
      },
    },

    // ======================================================
    // Inventory Consumption Rules
    // ======================================================
    /**
     * Determines how inventory movements affect accounting.
     */
    inventoryAccounting: {
      /**
       * ingredient → COGS
       * supply / cleaning → Operating Expense
       */
      consumptionBehavior: {
        ingredient: {
          debit: "COGS",
        },
        packaging: {
          debit: "COGS",
        },
        supply: {
          debit: "OPERATING_EXPENSE",
        },
        service: {
          debit: "OPERATING_EXPENSE",
        },
      },

      /**
       * When wastage/damage occurs
       */
      wastageTreatment: {
        debitInventoryAdjustment: { type: Boolean, default: true },
        allowReasonRequired: { type: Boolean, default: true },
      },
    },

    // ==============================================================
    // assets/liabilities valuation method
    // ==============================================================


    // ======================================================
    // Currency & Formatting
    // ======================================================
    currencySettings: {
      baseCurrency: {
        type: String,
        uppercase: true,
        maxlength: 3,
        default: "EGP",
      },
      currencySymbol: { type: String, default: "£" },

      multiCurrencyOption: {
        type: String,
        enum: ["singleCurrencyWithConversion", "accountPerCurrency"],
        default: "singleCurrencyWithConversion",
      },

      decimalPlaces: { type: Number, min: 0, max: 6, default: 2 },
      thousandSeparator: { type: String, default: "," },
      decimalSeparator: { type: String, default: "." },
    },

    // ======================================================
    // Journal Entry Control
    // ======================================================
    journalEntry: {
      autoNumber: { type: Boolean, default: true },
      prefix: { type: String, default: "JE" },
      nextNumber: { type: Number, default: 1 },

      requireApproval: { type: Boolean, default: false },
      allowEditAfterPosting: { type: Boolean, default: false },
      lockAfterPosting: { type: Boolean, default: true },

      minLines: { type: Number, default: 2 },
      maxLines: { type: Number, default: 50 },
    },

    // ======================================================
    // Fiscal Period
    // ======================================================
    fiscalPeriod: {
      fiscalYearStartMonth: { type: Number, default: 1 },
      allowBackDateEntries: { type: Boolean, default: true },
      autoClosePeriod: { type: Boolean, default: false },
    },

    // ======================================================
    // Cost Center
    // ======================================================
    costCenter: {
      enabled: { type: Boolean, default: true },
      defaultCostCenter: {
        type: ObjectId,
        ref: "CostCenter",
        default: null,
      },
      requiredOnJournalLine: { type: Boolean, default: false },
    },

    // ======================================================
    // Audit & System Flags
    // ======================================================
    audit: {
      trackCreatedBy: { type: Boolean, default: true },
      trackUpdatedBy: { type: Boolean, default: true },
      trackDeletedBy: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true }
);

accountingSettingsSchema.index(
  { brand: 1, branch: 1 },
  { unique: true }
);

export mongoose.model(
  "AccountingSettings",
  accountingSettingsSchema
);
